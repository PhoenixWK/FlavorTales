import type { Locale } from "@/shared/hooks/useLocale";

// ── Translation keys ───────────────────────────────────────────────────────────

export type TranslationKey =
  // Map page
  | "map.title"
  | "map.loading_map"
  | "map.session_init"
  // Location status messages
  | "location.loading"
  | "location.searching"
  | "location.denied"
  | "location.unavailable"
  | "location.error"
  | "location.my_location"
  | "location.locating"
  // Location permission screen
  | "location.permission.heading"
  | "location.permission.body"
  | "location.permission.allow"
  | "location.permission.allow_loading"
  | "location.permission.skip"
  | "location.permission.feature1.title"
  | "location.permission.feature1.body"
  | "location.permission.feature2.title"
  | "location.permission.feature2.body"
  // POI detail panel
  | "poi.open"
  | "poi.closed"
  | "poi.hear_story"
  | "poi.directions"
  | "poi.close"
  | "poi.search_placeholder";

// ── Dictionary ─────────────────────────────────────────────────────────────────

const dict: Record<Locale, Record<TranslationKey, string>> = {
  vi: {
    "map.title": "Bản đồ",
    "map.loading_map": "Đang tải bản đồ…",
    "map.session_init": "Đang khởi tạo phiên…",

    "location.loading": "Đang xác định vị trí…",
    "location.searching": "Đang tìm kiếm tín hiệu GPS…",
    "location.denied": "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
    "location.unavailable": "Không xác định được vị trí.",
    "location.error": "Không thể lấy vị trí. Hãy thử lại.",
    "location.my_location": "Vị trí của tôi",
    "location.locating": "Đang xác định…",

    "location.permission.heading": "Bật định vị",
    "location.permission.body": "Để tự động phát câu chuyện và hiển thị các quán ăn gần bạn, chúng tôi cần quyền truy cập vị trí.",
    "location.permission.allow": "Cho phép truy cập vị trí",
    "location.permission.allow_loading": "Đang xử lý",
    "location.permission.skip": "Nhập vị trí thủ công",
    "location.permission.feature1.title": "Câu chuyện lân cận",
    "location.permission.feature1.body": "Tự động phát khi bạn đi ngang các quán ăn nổi tiếng.",
    "location.permission.feature2.title": "Khám phá ẩm thực gần bạn",
    "location.permission.feature2.body": "Xem các điểm ăn uống được đánh giá cao ngay quanh góc phố của bạn.",

    "poi.open": "Đang mở",
    "poi.closed": "Đã đóng",
    "poi.hear_story": "Nghe thuyết minh",
    "poi.directions": "Chỉ đường nhanh nhất",
    "poi.close": "Đóng",
    "poi.search_placeholder": "Tìm kiếm quán ăn, món ăn…",
  },

  en: {
    "map.title": "Map",
    "map.loading_map": "Loading map…",
    "map.session_init": "Initialising session…",

    "location.loading": "Determining location…",
    "location.searching": "Searching for GPS signal…",
    "location.denied": "Location access denied. Please grant permission in your browser settings.",
    "location.unavailable": "Unable to determine location.",
    "location.error": "Could not get location. Please try again.",
    "location.my_location": "My location",
    "location.locating": "Locating…",

    "location.permission.heading": "Enable location",
    "location.permission.body": "To automatically play stories and show nearby restaurants, we need access to your location.",
    "location.permission.allow": "Allow location access",
    "location.permission.allow_loading": "Processing",
    "location.permission.skip": "Enter location manually",
    "location.permission.feature1.title": "Nearby stories",
    "location.permission.feature1.body": "Auto-plays as you walk past famous restaurants.",
    "location.permission.feature2.title": "Discover food near you",
    "location.permission.feature2.body": "See top-rated dining spots right around your corner.",

    "poi.open": "Open",
    "poi.closed": "Closed",
    "poi.hear_story": "Listen to story",
    "poi.directions": "Get directions",
    "poi.close": "Close",
    "poi.search_placeholder": "Search restaurants, dishes…",
  },

  zh: {
    "map.title": "地图",
    "map.loading_map": "地图加载中…",
    "map.session_init": "正在初始化会话…",

    "location.loading": "正在确定位置…",
    "location.searching": "正在搜索 GPS 信号…",
    "location.denied": "位置访问被拒绝。请在浏览器设置中授予权限。",
    "location.unavailable": "无法确定位置。",
    "location.error": "无法获取位置，请重试。",
    "location.my_location": "我的位置",
    "location.locating": "定位中…",

    "location.permission.heading": "开启定位",
    "location.permission.body": "为了自动播放故事并显示附近的餐厅，我们需要访问您的位置。",
    "location.permission.allow": "允许访问位置",
    "location.permission.allow_loading": "处理中",
    "location.permission.skip": "手动输入位置",
    "location.permission.feature1.title": "附近的故事",
    "location.permission.feature1.body": "经过著名餐厅时自动播放。",
    "location.permission.feature2.title": "探索附近美食",
    "location.permission.feature2.body": "查看您周边评分最高的餐厅。",

    "poi.open": "营业中",
    "poi.closed": "已打烊",
    "poi.hear_story": "收听讲解",
    "poi.directions": "获取路线",
    "poi.close": "关闭",
    "poi.search_placeholder": "搜索餐厅、菜品…",
  },
};

export default dict;
