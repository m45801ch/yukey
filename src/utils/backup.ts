import JSZip from "jszip";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeFile, readFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { PromptPluginSettings } from "@/prompt/prompt_builder";

export interface BackupData {
  version: string;
  timestamp: string;
  promptSettings: PromptPluginSettings;
  correctionRules: any[];
  customWords: string[];
}

/**
 * 產生可讀的 Markdown 說明文件內容
 */
const generateReadableMarkdown = (data: BackupData): string => {
  const { promptSettings, correctionRules, customWords } = data;
  const lines: string[] = [];

  lines.push(`# OpenLess 自訂備份與規則文件`);
  lines.push(
    `此文件由 OpenLess 系統自動匯出於：${new Date(data.timestamp).toLocaleString()}\n`,
  );

  // 1. 自訂模式
  lines.push(`## 1. 自訂修飾模式`);
  const customModes = Object.entries(promptSettings.customModes);
  if (customModes.length === 0) {
    lines.push(`*尚無自訂修飾模式*`);
  } else {
    customModes.forEach(([key, mode]) => {
      lines.push(`### 模式名稱：${mode.name}`);
      lines.push(`- **用途描述**：${mode.description}`);
      lines.push(`- **指令內容**：\n\`\`\`markdown\n${mode.content}\n\`\`\`\n`);
    });
  }

  // 2. 自訂詞庫
  lines.push(`## 2. 自訂專業詞庫`);
  const customDicts = Object.entries(promptSettings.customDictionaries);
  if (customDicts.length === 0) {
    lines.push(`*尚無自訂專業詞庫*`);
  } else {
    customDicts.forEach(([key, dict]) => {
      lines.push(`### 詞庫名稱：${dict.name}`);
      lines.push(`- **用途描述**：${dict.description}`);
      lines.push(`- **專有名詞列表**：\n\`\`\`\n${dict.content}\n\`\`\`\n`);
      const customEntries = promptSettings.dictionaryCustomEntries[key];
      if (customEntries && customEntries.length > 0) {
        lines.push(`  **使用者自訂詞語：**`);
        customEntries.forEach((entry) => {
          lines.push(`  - ${entry.term} → ${entry.explanation}`);
        });
      }
    });
  }

  // 2.5. 內建詞庫自訂詞語
  const allCustomEntries = Object.entries(
    promptSettings.dictionaryCustomEntries,
  );
  const builtInEntryKeys = allCustomEntries.filter(
    ([key]) => !key.startsWith("custom_"),
  );
  if (builtInEntryKeys.length > 0) {
    lines.push(`## 2.5. 內建詞庫自訂詞語`);
    for (const [key, entries] of builtInEntryKeys) {
      lines.push(`\n### 詞庫：${key}`);
      entries.forEach((entry) => {
        lines.push(`- ${entry.term} → ${entry.explanation}`);
      });
    }
  }

  // 3. 熱詞
  lines.push(`## 3. 本地熱詞 (Hotwords)`);
  if (customWords.length === 0) {
    lines.push(`*尚無自訂熱詞*`);
  } else {
    lines.push(`以下為系統辨識引擎與 AI 優先參考的專有名詞列表：`);
    customWords.forEach((word) => {
      lines.push(`- ${word}`);
    });
  }
  lines.push("");

  // 4. 糾錯規則
  lines.push(`## 4. 語音糾錯對照規則`);
  if (correctionRules.length === 0) {
    lines.push(`*尚無設定糾錯規則*`);
  } else {
    lines.push(`| 原始錯字/音 | 修正後正確字 | 是否啟用 |`);
    lines.push(`| :--- | :--- | :--- |`);
    correctionRules.forEach((rule) => {
      lines.push(
        `| ${rule.pattern} | ${rule.replacement} | ${rule.enabled ? "是" : "否"} |`,
      );
    });
  }

  return lines.join("\n");
};

/**
 * 產生糾錯對照 CSV
 */
const generateCorrectionsCSV = (rules: any[]): string => {
  const header = "Pattern,Replacement,Enabled\n";
  const rows = rules
    .map(
      (r) =>
        `"${r.pattern.replace(/"/g, '""')}","${r.replacement.replace(/"/g, '""')}",${r.enabled}`,
    )
    .join("\n");
  return header + rows;
};

/**
 * 執行一次性備份打包並匯出為 ZIP 壓縮檔
 */
export const exportBackupZip = async (
  promptSettings: PromptPluginSettings,
  customWords: string[],
) => {
  try {
    // 讀取糾錯規則
    let correctionRules: any[] = [];
    const savedRules = localStorage.getItem("yukey_correction_rules");
    if (savedRules) {
      try {
        correctionRules = JSON.parse(savedRules);
      } catch (e) {}
    }

    const backupData: BackupData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      promptSettings,
      correctionRules,
      customWords,
    };

    const zip = new JSZip();

    // 1. 加入系統回復用 JSON
    zip.file("backup.json", JSON.stringify(backupData, null, 2));

    // 2. 加入可讀 Markdown 說明文件
    zip.file("custom_rules.md", generateReadableMarkdown(backupData));

    // 3. 加入熱詞 txt
    zip.file("hotwords.txt", customWords.join("\n"));

    // 4. 加入糾錯對照 CSV
    zip.file("corrections.csv", generateCorrectionsCSV(correctionRules));

    // 壓縮
    const content = await zip.generateAsync({ type: "uint8array" });

    // 顯示儲存對話方塊
    const filePath = await save({
      filters: [
        {
          name: "Zip Archive",
          extensions: ["zip"],
        },
      ],
      defaultPath: "openless_backup.zip",
    });

    if (filePath) {
      await writeFile(filePath, content);
      toast.success("所有設定與詞庫已成功打包匯出 ZIP 檔！");
    }
  } catch (e) {
    console.error("Export backup failed", e);
    toast.error("匯出失敗，請查看控制台日誌");
  }
};

/**
 * 從 ZIP 壓縮檔讀取並還原備份資料
 */
export const importBackupZip = async (): Promise<BackupData | null> => {
  try {
    // 顯示開啟對話方塊
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: "Zip Archive",
          extensions: ["zip"],
        },
      ],
    });

    if (!selectedPath) return null;

    const path = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
    const fileData = await readFile(path);

    const zip = await JSZip.loadAsync(fileData);
    const backupJsonFile = zip.file("backup.json");

    if (!backupJsonFile) {
      toast.error("不合法的備份檔：未包含 backup.json！");
      return null;
    }

    const jsonText = await backupJsonFile.async("string");
    const backupData: BackupData = JSON.parse(jsonText);

    if (!backupData.promptSettings || !Array.isArray(backupData.customWords)) {
      toast.error("備份檔案格式已損壞，無法載入！");
      return null;
    }

    // 寫入 LocalStorage
    localStorage.setItem(
      "openless_prompt_plugin_settings",
      JSON.stringify(backupData.promptSettings),
    );
    localStorage.setItem(
      "yukey_correction_rules",
      JSON.stringify(backupData.correctionRules),
    );

    // 重新構造 VocabPage 使用的後綴快取
    const activeRules = backupData.correctionRules.filter(
      (r: any) => r.enabled,
    );
    let correctionPrompt = "";
    if (activeRules.length > 0) {
      correctionPrompt +=
        "\n\n# 語音識別糾錯對照表 (請務必將左方的錯字或發音模糊字，更正為右方的正確字)：\n";
      activeRules.forEach((r: any) => {
        correctionPrompt += `- "${r.pattern}" -> "${r.replacement}"\n`;
      });
    }
    localStorage.setItem("yukey_prompt_corrections_suffix", correctionPrompt);

    toast.success(
      "系統設定與詞庫已成功還原！請點擊上方「儲存並套用」使變更生效。",
    );
    return backupData;
  } catch (e) {
    console.error("Import backup failed", e);
    toast.error("匯入失敗，請確認檔案格式是否正確");
    return null;
  }
};
