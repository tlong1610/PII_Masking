# 🚀 CI Runner Guide - Self-Hosted trên Mac

## ✅ Status Hiện Tại

- **Runner đã cài đặt**: ✅ team-138-rin1652
- **Service đang chạy**: ✅ LaunchAgent (PID: 126)
- **Location**: `/Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner/`

## 🔄 Cách Hoạt Động

### Khi Mac Hoạt Động Bình Thường
- Runner service tự động chạy ngầm (LaunchAgent)
- Nhận jobs từ GitHub Actions
- Chạy CI workflow: lint + test
- Báo kết quả về GitHub

### Khi Gập Mac (Sleep/Suspend)
❗ **QUAN TRỌNG**: 
- Runner service sẽ **PAUSE** khi Mac sleep
- Jobs đang chạy sẽ **DỪNG LẠI**
- Khi mở Mac lại, runner **TỰ ĐỘNG RESUME**
- Jobs đã dừng sẽ **TIMEOUT** nếu sleep quá lâu (>10 phút)

### Khuyến Nghị
- **Không gập Mac khi có PR đang chạy CI**
- Hoặc setting Mac không sleep khi cắm điện:
  `System Settings → Lock Screen → Turn display off: Never (when plugged in)`

## 🔍 Check Status

### Xem Runner Đang Chạy
```bash
launchctl list | grep actions.runner
# Output: -	126	actions.runner.AI20K-Build-Phase-Cohort-4-P-138.team-138-rin1652
```

### Xem Logs
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
tail -f _diag/Runner_*.log
```

### Test Runner
```bash
# Push một commit nhỏ lên branch develop
git checkout develop
git commit --allow-empty -m "test: CI runner"
git push origin develop
```

## 🛠️ Quản Lý Service

### Start Service (nếu chưa chạy)
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./svc.sh start
```

### Stop Service
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./svc.sh stop
```

### Restart Service
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./svc.sh stop && ./svc.sh start
```

### Uninstall Service (nếu cần)
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./svc.sh uninstall
```

## ⚠️ Lưu Ý An Toàn

1. **Runner chạy với quyền user hiện tại**
   - Có thể đọc/ghi files trong home directory
   - Teammates push code → code chạy trên máy bạn
   - **Chỉ dùng với private repo** (đã đảm bảo)

2. **Không commit sensitive data**
   - SSH keys, API tokens, passwords
   - Teammates có thể đọc được nếu workflow echo ra

3. **5000+ files trong actions-runner/**
   - Bình thường, đó là runtime của GitHub Actions
   - Không commit vào Git (đã có trong .gitignore)

## 🎯 Workflow Hiện Tại

File: `.github/workflows/lint-and-test.yml`
```yaml
runs-on: self-hosted  # Sẽ chạy trên máy bạn
```

### Jobs:
1. **Install dependencies** - cài Python packages
2. **Lint with ruff** - check code style
3. **Run tests** - chạy pytest

## 🆘 Troubleshooting

### Lỗi: "Runner offline"
```bash
# Restart service
cd actions-runner
./svc.sh restart
```

### Lỗi: "Job timeout"
- Mac bị sleep quá lâu
- Restart runner và re-run job trên GitHub

### Lỗi: "Disk full"
```bash
# Dọn cache
cd actions-runner/_work/_temp
rm -rf *
```

## 📊 Khi Nào Đồng Đội Hưởng CI?

✅ **TẤT CẢ commits** lên repo P-138 sẽ chạy CI trên máy bạn
- Khi Tùng push → chạy trên máy bạn
- Khi Kiên push → chạy trên máy bạn  
- Khi tạo PR → chạy trên máy bạn

Chỉ cần:
- Mac đang bật
- Runner service đang chạy
- Có kết nối Internet
