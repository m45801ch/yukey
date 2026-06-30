from PIL import Image

def make_square(image_path):
    img = Image.open(image_path)
    width, height = img.size
    
    # 決定最大正方形邊長
    new_size = max(width, height)
    
    # 建立一個透明背景的透明正方形
    new_img = Image.new("RGBA", (new_size, new_size), (0, 0, 0, 0))
    
    # 將原圖貼在正中央
    offset = ((new_size - width) // 2, (new_size - height) // 2)
    new_img.paste(img, offset)
    
    # 儲存回原路徑
    new_img.save(image_path)
    print(f"Image {image_path} has been successfully made square to {new_size}x{new_size}.")

if __name__ == "__main__":
    make_square("icon/yukey-desktop-icon.png")
