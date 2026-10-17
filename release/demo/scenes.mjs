// Demo video scenes for the main flow. Each scene = narration (Vietnamese) + on-screen actions.
// `caption` is the subtitle text; `speak` (optional) is the text fed to the TTS voice when the
// written form would be mispronounced (acronyms, numbers). See DEMO_SCRIPT.md for the storyboard.

const SCAN_TABLES = ['customers', 'orders', 'order_details', 'support_tickets', 'kyc_documents'];

export const scenes = [
  {
    id: 'S01-intro',
    title: 'Giới thiệu',
    caption:
      'Xin chào. Đây là PIIGuard Shield, nền tảng giúp doanh nghiệp phát hiện và che dữ liệu cá nhân ' +
      'trước khi chia sẻ cho đội phân tích, theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.',
    speak:
      'Xin chào. Đây là P I I Guard Shield, nền tảng giúp doanh nghiệp phát hiện và che dữ liệu cá nhân ' +
      'trước khi chia sẻ cho đội phân tích, theo Luật Bảo vệ dữ liệu cá nhân số 91 năm 2025, và Nghị định 356 năm 2025.',
    async run({ page, ui }) {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await ui.hover(page.getByText('Phân quyền nghiêm ngặt'));
      await ui.pause(1500);
      await ui.hover(page.getByText('Không hiển thị dữ liệu cá nhân gốc'));
    },
  },
  {
    id: 'S02-login-dpo',
    title: 'DPO đăng nhập',
    caption: 'Người phụ trách bảo vệ dữ liệu, gọi tắt là DPO, đăng nhập vào không gian làm việc của mình.',
    speak: 'Người phụ trách bảo vệ dữ liệu, gọi tắt là D P O, đăng nhập vào không gian làm việc của mình.',
    async run({ page, ui }) {
      await ui.type(page.getByRole('textbox', { name: 'Tài khoản' }), 'dpo');
      await ui.type(page.getByRole('textbox', { name: 'Mật khẩu' }), 'dpo123');
      await ui.click(page.getByRole('button', { name: 'Đăng nhập', exact: true }));
      await page.waitForURL('**/dpo');
      await page.getByRole('heading', { name: 'Lượt quét mới' }).waitFor();
    },
  },
  {
    id: 'S03-scope',
    title: 'Chọn phạm vi quét',
    caption:
      'Đầu tiên, DPO chọn phạm vi cần quét. Sơ đồ bên phải cho thấy quan hệ giữa các bảng. ' +
      'Ở đây ta chọn năm bảng: khách hàng, đơn hàng, chi tiết đơn hàng, phiếu hỗ trợ và hồ sơ định danh.',
    speak:
      'Đầu tiên, D P O chọn phạm vi cần quét. Sơ đồ bên phải cho thấy quan hệ giữa các bảng. ' +
      'Ở đây ta chọn năm bảng: khách hàng, đơn hàng, chi tiết đơn hàng, phiếu hỗ trợ, và hồ sơ định danh.',
    async run({ page, ui }) {
      const toggle = page.getByRole('button', { name: /^\d+\/\d+$/ });
      await ui.click(toggle);
      for (const table of SCAN_TABLES) {
        await ui.click(page.getByRole('checkbox', { name: new RegExp(`^${table} `) }));
        await ui.pause(350);
      }
      await ui.hover(page.locator('.react-flow').first());
    },
  },
  {
    id: 'S04-scan',
    title: 'Quét PII',
    caption:
      'Bấm Bắt đầu quét. Hệ thống kết hợp luật nhận diện tiếng Việt, mô hình nhận dạng thực thể và AI ' +
      'để phân loại từng cột. DPO không bao giờ nhìn thấy giá trị gốc.',
    speak:
      'Bấm Bắt đầu quét. Hệ thống kết hợp luật nhận diện tiếng Việt, mô hình nhận dạng thực thể, và A I, ' +
      'để phân loại từng cột. D P O không bao giờ nhìn thấy giá trị gốc.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'Bắt đầu quét' }));
      await page.waitForURL(/\/dpo\/runs\/\d+/, { timeout: 180_000 });
      await page.getByRole('heading', { name: 'Phân loại cột & hành động' }).waitFor();
    },
  },
  {
    id: 'S05-overview',
    title: 'Tổng quan kết quả quét',
    caption:
      'Kết quả hiện ngay: điểm rủi ro, số cột dữ liệu cá nhân theo ba mức L1, L2, L3, và tỷ lệ cột đã được bảo vệ. ' +
      'Mỗi cột có đề xuất: che dữ liệu, băm HMAC để giữ khóa nối, che thực thể trong văn bản tự do, hoặc loại bỏ.',
    speak:
      'Kết quả hiện ngay: điểm rủi ro, số cột dữ liệu cá nhân theo ba mức, L 1, L 2, L 3, và tỷ lệ cột đã được bảo vệ. ' +
      'Mỗi cột có đề xuất: che dữ liệu, băm H MAC để giữ khóa nối, che thực thể trong văn bản tự do, hoặc loại bỏ.',
    async run({ page, ui }) {
      await ui.hover(page.getByRole('heading', { name: 'Điểm rủi ro' }));
      await ui.pause(1200);
      await ui.hover(page.getByRole('heading', { name: 'Cột PII phát hiện' }));
      await ui.pause(1200);
      await ui.hover(page.getByRole('heading', { name: 'Tỷ lệ bảo vệ' }));
      await ui.pause(800);
      await ui.scrollTo(page.getByRole('button', { name: 'contact_name', exact: true }));
      await ui.hover(page.getByRole('combobox', { name: 'Hành động cho cccd' }));
      await ui.pause(800);
      await ui.hover(page.getByRole('combobox', { name: 'Hành động cho personal_notes' }));
    },
  },
  {
    id: 'S06-override',
    title: 'Điều chỉnh có lý do',
    caption:
      'DPO có thể điều chỉnh từng cột. Ví dụ, thành phố giao hàng được nâng lên mức che dữ liệu. ' +
      'Khi khác với đề xuất, hệ thống bắt buộc ghi lý do để phục vụ kiểm toán.',
    speak:
      'D P O có thể điều chỉnh từng cột. Ví dụ, thành phố giao hàng được nâng lên mức che dữ liệu. ' +
      'Khi khác với đề xuất, hệ thống bắt buộc ghi lý do, để phục vụ kiểm toán.',
    async run({ page, ui }) {
      await ui.scrollTo(page.getByRole('button', { name: 'ship_city', exact: true }));
      await ui.click(page.getByRole('button', { name: 'ship_city', exact: true }));
      const drawer = page.locator('.MuiDrawer-paper');
      await ui.click(drawer.getByRole('combobox', { name: 'Hành động cho ship_city' }));
      await ui.click(page.getByRole('option', { name: /^Che dữ liệu/ }));
      await ui.click(drawer.getByRole('button', { name: 'Lưu & áp dụng thay đổi' }));
      await drawer.getByText('Bắt buộc ghi lý do cho quyết định này.').waitFor();
      await ui.pause(900);
      await ui.type(drawer.getByRole('textbox'), 'Thành phố kết hợp ngày đặt hàng có thể suy ra cá nhân.', 25);
      await ui.click(drawer.getByRole('button', { name: 'Lưu & áp dụng thay đổi' }));
      await drawer.waitFor({ state: 'hidden' });
    },
  },
  {
    id: 'S07-l3-guard',
    title: 'Chặn giữ nguyên dữ liệu nhạy cảm',
    caption:
      'Với dữ liệu nhạy cảm như nội dung giấy tờ tùy thân, hệ thống không cho phép giữ nguyên: ' +
      'lựa chọn Giữ nguyên bị khóa ngay trong danh sách, kèm ghi chú cấm với L3.',
    speak:
      'Với dữ liệu nhạy cảm như nội dung giấy tờ tùy thân, hệ thống không cho phép giữ nguyên: ' +
      'lựa chọn Giữ nguyên bị khóa ngay trong danh sách, kèm ghi chú cấm với L 3.',
    async run({ page, ui }) {
      await ui.scrollTo(page.getByRole('button', { name: 'ocr_text', exact: true }));
      await ui.click(page.getByRole('button', { name: 'ocr_text', exact: true }));
      const drawer = page.locator('.MuiDrawer-paper');
      await ui.click(drawer.getByRole('combobox', { name: 'Hành động cho ocr_text' }));
      await ui.hover(page.getByRole('option', { name: /^Giữ nguyên/ }));
      await ui.pause(2200);
      await page.keyboard.press('Escape');
      await ui.pause(400);
      await ui.click(drawer.getByRole('button', { name: 'Đóng' }));
    },
  },
  {
    id: 'S08-risk',
    title: 'Rủi ro & đánh giá',
    caption: 'Tab Rủi ro tổng hợp mức bảo vệ theo từng cấp độ và cách phân bổ các hành động bảo vệ.',
    async run({ page, ui }) {
      await ui.scrollTop();
      await ui.click(page.getByRole('tab', { name: 'Rủi ro & đánh giá' }));
      await ui.pause(1200);
      await ui.hover(page.getByRole('heading', { name: 'Mức bảo vệ theo quyết định hiện tại' }));
      await ui.pause(1000);
      await ui.hover(page.getByRole('heading', { name: 'Phân bổ hành động bảo vệ' }));
    },
  },
  {
    id: 'S09-build',
    title: 'Lưu, build và kiểm định',
    caption:
      'Duyệt xong, DPO bấm Lưu. Hệ thống ghi bản sao đã bảo vệ sang vùng dữ liệu riêng rồi tự kiểm định: ' +
      'phép nối bằng khóa băm HMAC vẫn khớp toàn bộ, tổng doanh thu không đổi, và không còn dữ liệu cá nhân gốc nào lọt ra.',
    speak:
      'Duyệt xong, D P O bấm Lưu. Hệ thống ghi bản sao đã bảo vệ sang vùng dữ liệu riêng, rồi tự kiểm định: ' +
      'phép nối bằng khóa băm H MAC vẫn khớp toàn bộ, tổng doanh thu không đổi, và không còn dữ liệu cá nhân gốc nào lọt ra.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'Lưu', exact: true }));
      await page.getByText('Chờ phát hành').first().waitFor({ timeout: 180_000 });
      await ui.click(page.getByRole('tab', { name: 'Dữ liệu cho Analyst' }));
      const checks = page.getByRole('table', { name: 'Kết quả kiểm định downstream' });
      await checks.waitFor();
      for (const name of ['sql_join_hmac', 'sql_aggregate_revenue', 'zero_raw_pii_egress']) {
        await ui.hover(checks.getByRole('row').filter({ hasText: name }));
        await ui.pause(1100);
      }
      await ui.scrollTo(page.getByRole('heading', { name: 'Xem trước dữ liệu cho Analyst' }));
    },
  },
  {
    id: 'S10-report',
    title: 'Báo cáo tuân thủ',
    caption: 'Báo cáo tuân thủ được tạo tự động, sẵn sàng cho thanh tra hoặc đánh giá tác động.',
    async run({ page, ui, recorder }) {
      await ui.scrollTop();
      const [report] = await Promise.all([
        page.waitForEvent('popup'),
        ui.click(page.getByRole('button', { name: 'Báo cáo tuân thủ' })),
      ]);
      await report.waitForLoadState('load');
      await report.getByText('BÁO CÁO TUÂN THỦ').first().waitFor();
      await recorder.follow(report);
      await ui.pause(2200);
      await report.mouse.wheel(0, 600);
      await ui.pause(2600);
      await recorder.follow(page);
      await report.close();
    },
  },
  {
    id: 'S11-publish',
    title: 'Phát hành & nhật ký kiểm toán',
    caption:
      'Kiểm định đạt, DPO phát hành dữ liệu cho đội phân tích. Mọi thao tác đều được ghi vào nhật ký chuỗi băm: ' +
      'không ai sửa hay xóa được một dòng mà không bị phát hiện.',
    speak:
      'Kiểm định đạt, D P O phát hành dữ liệu cho đội phân tích. Mọi thao tác đều được ghi vào nhật ký chuỗi băm: ' +
      'không ai sửa hay xóa được một dòng mà không bị phát hiện.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'Phát hành', exact: true }));
      await ui.click(page.getByRole('dialog').getByRole('button', { name: 'Phát hành' }));
      await page.getByText('Đã phát hành').first().waitFor();
      await ui.pause(900);
      await ui.click(page.getByRole('link', { name: 'Nhật ký hoạt động' }));
      await page.getByText('Nhật ký nguyên vẹn').waitFor();
      await ui.hover(page.getByText('Nhật ký nguyên vẹn'));
      await ui.pause(1200);
      await ui.hover(page.getByRole('cell', { name: 'Phát hành', exact: true }).first());
    },
  },
  {
    id: 'S12-login-analyst',
    title: 'Chuyển sang Analyst',
    caption:
      'Bây giờ, chuyển sang vai trò chuyên viên phân tích. Analyst đăng nhập bằng tài khoản riêng và chỉ có quyền đọc ' +
      'những dữ liệu đã được phát hành.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'Đăng xuất' }));
      await ui.click(page.getByRole('dialog').getByRole('button', { name: 'Đăng xuất' }));
      await page.waitForURL('**/login');
      await ui.type(page.getByRole('textbox', { name: 'Tài khoản' }), 'analyst');
      await ui.type(page.getByRole('textbox', { name: 'Mật khẩu' }), 'analyst123');
      await ui.click(page.getByRole('button', { name: 'Đăng nhập', exact: true }));
      await page.waitForURL('**/analyst');
      await page.getByRole('heading', { name: 'Dataset đã phát hành' }).waitFor();
    },
  },
  {
    id: 'S13-analyst-data',
    title: 'Dữ liệu đã bảo vệ',
    caption:
      'Analyst chỉ thấy dữ liệu đã phát hành, và dữ liệu vẫn dùng được: cột băm HMAC vẫn ghép bảng và đếm khách hàng được, ' +
      'ghi chú tự do vẫn đọc được nhưng số điện thoại, email và căn cước đã được thay bằng nhãn.',
    speak:
      'Analyst chỉ thấy dữ liệu đã phát hành, và dữ liệu vẫn dùng được: cột băm H MAC vẫn ghép bảng và đếm khách hàng được, ' +
      'ghi chú tự do vẫn đọc được, nhưng số điện thoại, email, và căn cước đã được thay bằng nhãn.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'customers', exact: true }));
      const grid = page.getByRole('table');
      await grid.getByRole('row').nth(1).waitFor();
      // Header accessible names are their tooltips, so match the visible column name instead.
      await ui.hover(grid.getByRole('columnheader').filter({ hasText: 'customer_id' }));
      await ui.pause(1500);
      await grid.getByRole('columnheader').filter({ hasText: 'personal_notes' }).scrollIntoViewIfNeeded();
      await ui.pause(500);
      await ui.hover(grid.getByRole('row').nth(1).getByRole('cell').last());
      await ui.pause(1500);
      await ui.click(page.getByRole('button', { name: 'kyc_documents', exact: true }));
    },
  },
  {
    id: 'S14-analyst-guide',
    title: 'Hướng dẫn cột, sơ đồ, tải CSV',
    caption:
      'Hướng dẫn cột giải thích cách dùng từng trường, sơ đồ quan hệ giúp viết truy vấn nối bảng, ' +
      'và Analyst có thể tải tệp CSV đã bảo vệ.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('tab', { name: 'Các cột & cách dùng' }));
      await ui.pause(1800);
      await ui.click(page.getByRole('tab', { name: 'Quan hệ giữa các bảng' }));
      await ui.pause(2200);
      await ui.click(page.getByRole('tab', { name: 'Dữ liệu đã bảo vệ' }));
      await ui.click(page.getByRole('button', { name: 'customers', exact: true }));
      await Promise.all([page.waitForEvent('download'), ui.click(page.getByRole('button', { name: /Tải CSV/ }))]);
    },
  },
  {
    id: 'S15-outro',
    title: 'Kết',
    caption:
      'PIIGuard Shield: phát hiện đúng, che đủ, dữ liệu vẫn hữu ích, và mọi bước đều có bằng chứng kiểm toán. ' +
      'Cảm ơn quý vị đã theo dõi.',
    speak:
      'P I I Guard Shield: phát hiện đúng, che đủ, dữ liệu vẫn hữu ích, và mọi bước đều có bằng chứng kiểm toán. ' +
      'Cảm ơn quý vị đã theo dõi.',
    async run({ page, ui }) {
      await ui.click(page.getByRole('button', { name: 'Đăng xuất' }));
      await ui.click(page.getByRole('dialog').getByRole('button', { name: 'Đăng xuất' }));
      await page.waitForURL('**/login');
      await ui.hover(page.getByText('Không hiển thị dữ liệu cá nhân gốc'));
    },
  },
];
