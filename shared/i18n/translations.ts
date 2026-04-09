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
  | "poi.search_placeholder"
  | "poi.loading_translation";

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
    "poi.loading_translation": "Đang dịch…",
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
    "poi.loading_translation": "Translating…",
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
    "poi.loading_translation": "翻译中…",
  },

  ru: {
    "map.title": "Карта",
    "map.loading_map": "Загрузка карты…",
    "map.session_init": "Инициализация сессии…",

    "location.loading": "Определение местоположения…",
    "location.searching": "Поиск сигнала GPS…",
    "location.denied": "Доступ к местоположению запрещён. Разрешите его в настройках браузера.",
    "location.unavailable": "Не удалось определить местоположение.",
    "location.error": "Не удалось получить местоположение. Попробуйте ещё раз.",
    "location.my_location": "Моё местоположение",
    "location.locating": "Определение…",

    "location.permission.heading": "Включить геолокацию",
    "location.permission.body": "Чтобы автоматически воспроизводить истории и показывать ближайшие рестораны, нам нужен доступ к вашему местоположению.",
    "location.permission.allow": "Разрешить доступ к местоположению",
    "location.permission.allow_loading": "Обработка",
    "location.permission.skip": "Ввести местоположение вручную",
    "location.permission.feature1.title": "Истории рядом",
    "location.permission.feature1.body": "Автоматически воспроизводится, когда вы проходите мимо знаменитых ресторанов.",
    "location.permission.feature2.title": "Откройте для себя еду рядом",
    "location.permission.feature2.body": "Смотрите лучшие заведения прямо за углом.",

    "poi.open": "Открыто",
    "poi.closed": "Закрыто",
    "poi.hear_story": "Слушать рассказ",
    "poi.directions": "Проложить маршрут",
    "poi.close": "Закрыть",
    "poi.search_placeholder": "Поиск ресторанов, блюд…",
    "poi.loading_translation": "Перевод…",
  },

  ja: {
    "map.title": "地図",
    "map.loading_map": "地図を読み込んでいます…",
    "map.session_init": "セッションを初期化しています…",

    "location.loading": "位置を確認しています…",
    "location.searching": "GPS信号を検索しています…",
    "location.denied": "位置情報へのアクセスが拒否されました。ブラウザの設定で許可してください。",
    "location.unavailable": "位置情報を取得できません。",
    "location.error": "位置情報を取得できませんでした。もう一度お試しください。",
    "location.my_location": "現在地",
    "location.locating": "位置確認中…",

    "location.permission.heading": "位置情報を有効にする",
    "location.permission.body": "ストーリーを自動再生し、近くのレストランを表示するために、位置情報へのアクセスが必要です。",
    "location.permission.allow": "位置情報へのアクセスを許可する",
    "location.permission.allow_loading": "処理中",
    "location.permission.skip": "位置情報を手動で入力する",
    "location.permission.feature1.title": "近くのストーリー",
    "location.permission.feature1.body": "有名なレストランを通り過ぎると自動再生されます。",
    "location.permission.feature2.title": "近くのグルメを探す",
    "location.permission.feature2.body": "すぐそこにある高評価の飲食店を見つけましょう。",

    "poi.open": "営業中",
    "poi.closed": "閉店",
    "poi.hear_story": "ストーリーを聴く",
    "poi.directions": "ルートを取得",
    "poi.close": "閉じる",
    "poi.search_placeholder": "レストラン、料理を検索…",
    "poi.loading_translation": "翻訳中…",
  },

  ko: {
    "map.title": "지도",
    "map.loading_map": "지도를 불러오는 중…",
    "map.session_init": "세션을 초기화하는 중…",

    "location.loading": "위치를 확인하는 중…",
    "location.searching": "GPS 신호를 검색 중…",
    "location.denied": "위치 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.",
    "location.unavailable": "위치를 확인할 수 없습니다.",
    "location.error": "위치를 가져올 수 없습니다. 다시 시도해 주세요.",
    "location.my_location": "내 위치",
    "location.locating": "위치 확인 중…",

    "location.permission.heading": "위치 서비스 활성화",
    "location.permission.body": "스토리를 자동으로 재생하고 근처 식당을 표시하려면 위치 접근 권한이 필요합니다.",
    "location.permission.allow": "위치 접근 허용",
    "location.permission.allow_loading": "처리 중",
    "location.permission.skip": "위치를 수동으로 입력",
    "location.permission.feature1.title": "근처 스토리",
    "location.permission.feature1.body": "유명 식당을 지나갈 때 자동으로 재생됩니다.",
    "location.permission.feature2.title": "근처 맛집 탐색",
    "location.permission.feature2.body": "바로 주변의 인기 식당을 확인해 보세요.",

    "poi.open": "영업 중",
    "poi.closed": "영업 종료",
    "poi.hear_story": "스토리 듣기",
    "poi.directions": "길 안내",
    "poi.close": "닫기",
    "poi.search_placeholder": "식당, 음식 검색…",
    "poi.loading_translation": "번역 중…",
  },
};

export default dict;
