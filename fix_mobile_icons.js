// ฟังก์ชันเพื่อแก้ไขการแสดงไอคอนสถานะในโหมดมือถือและเดสก์ท็อป
function fixStatusIcons() {
    // เลือกทุกไอคอนสถานะในรายการเครื่องบิน
    const statusIcons = document.querySelectorAll('.status-icon');

    // ตรวจสอบว่ามีการเพิ่ม style สำหรับ status-icon แล้วหรือไม่
    if (!document.getElementById('status-icon-style')) {
        // สร้าง style element เพียงครั้งเดียว
        const style = document.createElement('style');
        style.id = 'status-icon-style';
        style.textContent = `
            .status-icon.green::before, .status-icon.green::after,
            .status-icon.red::before, .status-icon.red::after {
                content: none !important;
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ปรับแต่งแต่ละไอคอน
    statusIcons.forEach(icon => {
        // ลบเนื้อหาทั้งหมดภายในไอคอน
        while (icon.firstChild) {
            icon.removeChild(icon.firstChild);
        }

        // กำหนดสไตล์ให้เป็นจุดกลมสีเท่านั้น
        icon.style.display = 'inline-block';
        icon.style.width = '10px';
        icon.style.height = '10px';
        icon.style.marginRight = '8px';
        icon.style.flexShrink = '0';
        icon.style.textIndent = '-9999px';
        icon.style.overflow = 'hidden';
        icon.innerHTML = ''; // เอาเครื่องหมายกากบาทและถูกออก

        // ปรับแต่งสีและเงาตามสถานะ
        if (icon.classList.contains('green')) {
            icon.style.backgroundColor = 'var(--success-color)';
            icon.style.boxShadow = '0 0 5px rgba(56, 176, 0, 0.5)';
        } else if (icon.classList.contains('red')) {
            icon.style.backgroundColor = 'var(--danger-color)';
            icon.style.boxShadow = '0 0 5px rgba(255, 51, 102, 0.5)';
        }
    });

    // ปรับแต่งการจัดวางในรายการ
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    aircraftItems.forEach(item => {
        item.style.alignItems = 'center';
    });
}

// เรียกใช้ฟังก์ชันเมื่อโหลดหน้าเว็บและเมื่อมีการเปลี่ยนขนาดหน้าจอ
document.addEventListener('DOMContentLoaded', fixStatusIcons);
window.addEventListener('resize', fixStatusIcons);

// เรียกใช้ฟังก์ชันหลังจากสร้างรายการเครื่องบินเสร็จ
// ตรวจสอบว่า updateAircraftList มีอยู่หรือไม่ก่อนที่จะ override
if (typeof window.updateAircraftList === 'function') {
    const originalUpdateAircraftList = window.updateAircraftList;
    window.updateAircraftList = function(...args) {
        const result = originalUpdateAircraftList.apply(this, args);
        setTimeout(fixStatusIcons, 100); // เรียกใช้ฟังก์ชันหลังจากอัปเดตรายการเสร็จ
        return result;
    };
} else {
    // ถ้ายังไม่มี updateAircraftList ให้รอจนกว่าจะมี
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.updateAircraftList === 'function') {
            const originalUpdateAircraftList = window.updateAircraftList;
            window.updateAircraftList = function(...args) {
                const result = originalUpdateAircraftList.apply(this, args);
                setTimeout(fixStatusIcons, 100); // เรียกใช้ฟังก์ชันหลังจากอัปเดตรายการเสร็จ
                return result;
            };
        }
    });
}