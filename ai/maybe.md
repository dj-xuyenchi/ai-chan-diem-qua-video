-- cấu trúc project
 - \src\main\java\com\theduc\ai\controller: tạo các rest controller API class
 - \src\main\java\com\theduc\ai\entity: Khai báo các class java mapping bảng
 - \src\main\java\com\theduc\ai\dto: Khai báo các class dto để làm request reponse cho api và service
 - \src\main\java\com\theduc\ai\repository: Khai báo các JPA interface mapping class với bảng  database
 - \src\main\java\com\theduc\ai\service: Khai báo các class nghiệp vụ dạng interface và class triển khai Implement trong folder impl
 - \src\main\java\com\theduc\ai\util: Khai báo các hàm dùng chung
 - \src\main\java\com\theduc\ai\constant: Enum và biến final lưu ở đây

-- Nguyên tắc khi code:
Phân tách rõ các yêu cầu theo file code không code chung trừ khi nghiệp vụ cụ thể còn các bài toàn crud đơn giản thì phải tách rõ ví dụ Người dùng thì sẽ tạo Class NguoiDung.java ở \src\main\java\com\theduc\ai\entity và 1 class JPA repo ở \src\main\java\com\theduc\ai\repository các hàm crud khai báo ở \src\main\java\com\theduc\ai\service  dạng Interface NguoiDungService,java và 1 class NguoiDungServiceImpl.java ở folder impl và nội dung code trong đấy. Api và service sẽ giao tiếp thông qua dto có request class và response class không sử dụng entity để trả ra ngoài api mà chỉ dùng để mapping jpa 

-- Thư viện hỗ trợ được phép sử dụng
Lombok (getter(full class), setter(full class), builder, AllArgsConstructor, NoArgsConstructor, RequiredArgsConstructor(service khi Dependency Injection))
JPA
-- REST method được phép sử dụng
- POST
- GET
 