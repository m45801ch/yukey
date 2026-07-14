use anyhow::Result;
use hound::{WavReader, WavSpec, WavWriter};
use log::debug;
use std::path::Path;

/// Read a WAV file and return normalised f32 samples.
pub fn read_wav_samples<P: AsRef<Path>>(file_path: P) -> Result<Vec<f32>> {
    let reader = WavReader::open(file_path.as_ref())?;
    let samples = reader
        .into_samples::<i16>()
        .map(|s| s.map(|v| v as f32 / i16::MAX as f32))
        .collect::<Result<Vec<f32>, _>>()?;
    Ok(samples)
}

/// Verify a WAV file by reading it back and checking the sample count.
pub fn verify_wav_file<P: AsRef<Path>>(file_path: P, expected_samples: usize) -> Result<()> {
    let reader = WavReader::open(file_path.as_ref())?;
    let actual_samples = reader.len() as usize;
    if actual_samples != expected_samples {
        anyhow::bail!(
            "WAV sample count mismatch: expected {}, got {}",
            expected_samples,
            actual_samples
        );
    }
    Ok(())
}

/// Save audio samples as a WAV file
pub fn save_wav_file<P: AsRef<Path>>(file_path: P, samples: &[f32]) -> Result<()> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::create(file_path.as_ref(), spec)?;

    // Convert f32 samples to i16 for WAV
    for sample in samples {
        let sample_i16 = (sample * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }

    writer.finalize()?;
    debug!("Saved WAV file: {:?}", file_path.as_ref());
    Ok(())
}

pub fn decode_mp3(path: &Path) -> Result<(Vec<f32>, u64), String> {
    use rubato::{FftFixedIn, Resampler};
    use symphonia::core::{
        audio::SampleBuffer,
        codecs::DecoderOptions,
        formats::FormatOptions,
        io::MediaSourceStream,
        meta::MetadataOptions,
        probe::Hint,
    };

    debug!("decode_mp3: opening {:?}", path);
    let file = std::fs::File::open(path).map_err(|e| {
        let msg = format!("Cannot open file {:?}: {}", path, e);
        debug!("{}", msg);
        msg
    })?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| format!("Cannot probe file: {}", e))?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .first()
        .ok_or("No audio track found")?
        .clone();
    let track_id = track.id;

    let codec_params = track.codec_params;
    let src_sample_rate = codec_params.sample_rate.unwrap_or(16000) as usize;
    let duration_ms = codec_params
        .n_frames
        .map(|n| {
            let rate = codec_params.sample_rate.unwrap_or(16000) as f64;
            (n as f64 / rate * 1000.0) as u64
        })
        .unwrap_or(0);

    debug!(
        "decode_mp3: track_id={}, src_sample_rate={}, n_frames={:?}, duration_ms={}",
        track_id,
        src_sample_rate,
        codec_params.n_frames,
        duration_ms
    );

    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &DecoderOptions::default())
        .map_err(|e| format!("Cannot create decoder: {}", e))?;

    let mut all_samples: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(pkt) => pkt,
            Err(symphonia::core::errors::Error::IoError(ref e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break
            }
            Err(_) => break,
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = decoder
            .decode(&packet)
            .map_err(|e| format!("Decode error: {}", e))?;

        let num_channels = decoded.spec().channels.count() as usize;
        let mut buf = SampleBuffer::<f32>::new(decoded.capacity() as u64, *decoded.spec());
        buf.copy_interleaved_ref(decoded);

        if num_channels == 1 {
            all_samples.extend_from_slice(buf.samples());
        } else {
            for chunk in buf.samples().chunks(num_channels) {
                let mono: f32 = chunk.iter().sum::<f32>() / num_channels as f32;
                all_samples.push(mono);
            }
        }
    }

    debug!("decode_mp3: decoded {} mono samples", all_samples.len());

    if (src_sample_rate as f64 - 16000.0).abs() > 0.1 {
        let mut resampler = FftFixedIn::<f32>::new(src_sample_rate, 16000, 1024, 1, 1)
            .map_err(|e| format!("Resampler error: {}", e))?;
        let mut resampled = Vec::new();
        let in_buf: Vec<&[f32]> = vec![&all_samples];
        let out = resampler
            .process(&in_buf, None)
            .map_err(|e| format!("Resample error: {}", e))?;
        for buf in out {
            resampled.extend_from_slice(&buf);
        }
        debug!("decode_mp3: resampled to {} samples", resampled.len());
        Ok((resampled, duration_ms))
    } else {
        Ok((all_samples, duration_ms))
    }
}
