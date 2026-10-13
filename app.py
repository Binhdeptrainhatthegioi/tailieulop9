import tkinter as tk
import keyboard
import threading
import random
import os
import time

is_running = False
windows = []
main_root = None

def close_all():
    """Hàm tắt toàn bộ chương trình khi nhấn F9 lần 2"""
    global is_running
    is_running = False
    
    # Đóng tất cả cửa sổ hiện có
    for w in windows:
        try:
            w.destroy()
        except:
            pass
    # Thoát ngang chương trình
    os._exit(0)

def listen_for_close():
    """Lắng nghe phím F9 lần 2"""
    keyboard.wait('f9')
    close_all()

def auto_close_window(win):
    """Hàm tự động đóng một cửa sổ sau một khoảng thời gian"""
    try:
        if win in windows:
            windows.remove(win)
        win.destroy()
    except:
        pass

def spawn_window():
    """Hàm tạo ra cửa sổ mới liên tục"""
    if not is_running:
        return
        
    # Tạo cửa sổ phụ
    win = tk.Toplevel(main_root)
    win.overrideredirect(True) # Xóa hẳn thanh tiêu đề trắng mặc định của Windows
    
    # Tăng kích thước cửa sổ to hơn để chiếm vùng rộng hơn
    window_width = 550
    window_height = 250
    screen_width = win.winfo_screenwidth()
    screen_height = win.winfo_screenheight()
    # Cho phép cửa sổ sinh ra có thể chờm ra ngoài rìa màn hình một chút
    x = random.randint(-100, screen_width - 100)
    y = random.randint(-100, screen_height - 100)
    
    win.geometry(f"{window_width}x{window_height}+{x}+{y}")
    win.attributes('-topmost', True) # Luôn hiện trên cùng
    win.configure(bg='black') # Chỉnh nền cửa sổ thành màu đen

    # Tạo thanh tiêu đề giả màu đen tuyền
    title_bar = tk.Frame(win, bg="#222222", relief="flat", bd=0)
    title_bar.pack(expand=False, fill="x", side="top")
    
    # Chữ Tsbinh trên thanh tiêu đề giả
    title_label = tk.Label(title_bar, text="Tsbinh", bg="#222222", fg="white", font=("Arial", 10))
    title_label.pack(side="left", padx=10, pady=2)
    
    # Chữ Hacked to hơn
    label = tk.Label(win, text="Hacked by Binh", font=("Arial", 50, "bold"), bg='black', fg='red')
    label.pack(expand=True)
    
    windows.append(win)
    
    # Cửa sổ tồn tại lâu hơn (2.5 giây) để màn hình tích tụ nhiều cửa sổ cùng lúc hơn
    win.after(2500, lambda: auto_close_window(win))
    
    # Lên lịch tạo cửa sổ TIẾP THEO cực nhanh sau 0.04 giây (40ms)
    if is_running:
        main_root.after(40, spawn_window)

if __name__ == "__main__":
    print("Chương trình đang chạy ngầm...")
    print("-> Nhấn 'F9' lần 1 để BẮT ĐẦU hiệu ứng pop-up liên tục.")
    
    # 1. Chờ phím F9 lần đầu
    keyboard.wait('f9')
    time.sleep(0.5) 
    
    print("-> Đang chạy! Nhấn 'F9' lần 2 để TẮT tất cả.")

    # 2. Chạy luồng lắng nghe phím F9 lần 2 để ngắt
    listener_thread = threading.Thread(target=listen_for_close, daemon=True)
    listener_thread.start()

    is_running = True
    
    # Khởi tạo cửa sổ gốc (nhưng ẩn nó đi để làm nền chạy ngầm)
    main_root = tk.Tk()
    main_root.withdraw() 
    
    # 3. Kích hoạt phát súng đầu tiên tạo pop-up
    spawn_window()

    # 4. Bắt đầu vòng lặp giao diện
    main_root.mainloop()
