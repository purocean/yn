# Hướng dẫn thiết lập môi trường phát triển

[English](./DEVELOP.md) | [中文说明](./DEVELOP_ZH-CN.md) | Tiếng Việt

## Thiết lập môi trường phát triển

### Cài đặt node
### Cài đặt n
n là công cụ quản lý phiên bản của node. Bạn có thể chuyển đổi phiên bản node tùy ý, vì yn cần node phiên bản 12.0 trở lên
Dùng n để chuyển đổi

Xem phiên bản node hiện tại:
`node -v`

Cài đặt n
`npm install -g n`

Nâng cấp lên phiên bản chỉ định/phiên bản mới nhất (bước này có thể mất một lúc). Trước khi nâng cấp, bạn có thể chạy n ls (xem các phiên bản có thể nâng cấp)`n v16.0.0`

Hoặc bạn có thể yêu cầu trình quản lý cài phiên bản ổn định mới nhất
`n stable | n latest`

### Cài đặt các phụ thuộc
`yarn install`

Lưu ý rằng đôi khi không thể cài đặt thành công toàn bộ phụ thuộc, khi đó bạn cần cài thủ công từng gói
Lúc này chỉ cần chạy `npm install package@version`, ví dụ `npm install mine@2.5.2`

Module node-pty không thể cài đặt thành công một cách đơn giản, có thể thao tác như mô tả dưới đây

### Cài đặt electron-rebuild
`npm install --save-dev electron-rebuild`
### Build lại pty
`npm run rebuild-pty`

### Khởi chạy chế độ phát triển
`npm run dev`



## Ranh giới kiểm tra yêu cầu HTTP API

Các yêu cầu API được kiểm tra trước khi phân tích body hoặc trước khi route tạo ra
tác động. Server so sánh Origin/Referer của trình duyệt với Host của yêu cầu HTTP,
từ chối các nguồn gốc trình duyệt khác nguồn gốc (cross-origin) rõ ràng, opaque/null,
sai định dạng hoặc mâu thuẫn, và chấp nhận các yêu cầu cùng nguồn gốc từ trình duyệt
cũng như các yêu cầu qua giao thức nội bộ của Electron.
Hỗ trợ nguồn trình duyệt HTTP và HTTPS, kể cả khi kết thúc TLS tại một reverse
proxy. Proxy phải giữ nguyên Host gốc (bao gồm cả cổng không mặc định, nếu có);
không cần header chuyển tiếp giao thức. Khi có cả Origin và Referer thì hai giá trị
này phải khớp nhau.
Không có danh sách cho phép Host/địa chỉ, cũng không có bảo vệ chống DNS rebinding.
Các yêu cầu không có Origin, Referer hoặc Sec-Fetch-Site vẫn giữ nguyên cách xác thực
API/MCP gốc hiện có. Đây là để tương thích, không phải bằng chứng rằng bên gọi đáng tin
cậy: các chương trình gốc và client cũ có thể bỏ qua hoặc giả mạo header của trình duyệt.
Không cần thay đổi cấu hình MCP hay cách cấp token.

Các yêu cầu API có body bắt buộc dùng `application/json` (cho phép các tham số như
charset), với các ngoại lệ theo định dạng hiện có sau:
- POST `/api/attachment`: cũng chấp nhận tải lên dạng multipart form.
- POST `/api/tmp-file` và `/api/user-file`: cũng chấp nhận `text/plain` thô.
- `/api/proxy-fetch/…`: luồng gốc được chuyển tiếp mà không lọc MIME.

Mọi ngoại lệ vẫn phải qua kiểm tra nguồn gốc và quyền. Các yêu cầu GET/DELETE không
có body và các hành động extension hiện có chỉ dùng query không cần body JSON. Các
route thay đổi dữ liệu dựa trên body đã biết sẽ từ chối phương thức không hỗ trợ trước
khi tới handler. Tài nguyên không thuộc API không chịu yêu cầu JSON.

Tài liệu nhúng có khả năng thực thi còn yêu cầu nguồn gốc đáng tin cậy ngay cả khi
điều hướng, bao gồm cả các đường dẫn tĩnh/được mã hóa trỏ tới nó. Việc điều hướng tới
trang gốc và các frame, cửa sổ xem trước cùng nguồn gốc/nội bộ vẫn được hỗ trợ.
Polling, nâng cấp kết nối của Socket.IO và phần xử lý trước PTY yêu cầu độc lập nguồn
gốc đáng tin cậy và peer loopback; chế độ tương thích API gốc không miễn trừ cho các
yêu cầu terminal. Renderer `yank-note:` dùng WebSocket trực tiếp; các mặc định
transport của trình duyệt không thay đổi.

Các phản hồi JSON và JavaScript của phần cài đặt chỉ loại bỏ `server.jwt-secret` khỏi
một bản sao. Cài đặt đã lưu bộ nhớ đệm, cài đặt đã lưu bền vững và khóa ký không được
xoay vòng. Các kiểm tra này không giải quyết XSS cùng nguồn gốc, quyền truy cập gốc của
cùng người dùng, hay rủi ro quản trị loopback sẵn có khi reverse proxy được mở ra
bên ngoài. Truy cập qua reverse proxy cần xác thực riêng.

Proxy phát triển có thể chuyển tiếp nguyên vẹn Host của frontend và nguồn trình duyệt
để so sánh cùng nguồn gốc; không cần ngoại lệ nguồn gốc dành cho môi trường phát triển.
