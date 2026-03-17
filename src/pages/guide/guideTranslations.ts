export interface GuideItem {
  title: string;
  description: string;
}

export interface GuideSection {
  title: string;
  items: GuideItem[];
}

export interface GuideTranslation {
  pageTitle: string;
  tocTitle: string;
  adminBadge: string;
  memberBadge: string;
  tipLabel: string;
  noteLabel: string;
  shortcutLabel: string;
  screenshotPlaceholder: string;
  sections: {
    gettingStarted: GuideSection;
    dashboard: GuideSection;
    quoteCalculator: GuideSection;
    savingQuotes: GuideSection;
    pdfExport: GuideSection;
    quoteHistory: GuideSection;
    accountSettings: GuideSection;
    adminOverview: GuideSection;
    marginRules: GuideSection;
    fscManagement: GuideSection;
    surchargeManagement: GuideSection;
    customerManagement: GuideSection;
    userManagement: GuideSection;
    rateTableViewer: GuideSection;
    auditLog: GuideSection;
  };
}

export const guideTranslations: Record<string, GuideTranslation> = {
  en: {
    pageTitle: 'User Guide',
    tocTitle: 'Table of Contents',
    adminBadge: 'Admin',
    memberBadge: 'Member',
    tipLabel: 'Tip',
    noteLabel: 'Note',
    shortcutLabel: 'Shortcut',
    screenshotPlaceholder: '[Screenshot: %s]',
    sections: {
      gettingStarted: {
        title: 'Getting Started',
        items: [
          {
            title: 'Creating an Account',
            description: 'Click "Sign Up" on the top-right corner. Fill in your email, password, company name, name, nationality, and optionally select your freight network memberships (WCA, MPL, EAN, JCtrans). Your account will be activated immediately after registration.',
          },
          {
            title: 'Logging In',
            description: 'Click "Login" and enter your registered email and password. The system remembers your language preference and theme setting across sessions.',
          },
          {
            title: 'Language & Theme',
            description: 'Use the globe icon to switch between English, Korean, Japanese, and Chinese. Use the moon/sun icon to toggle dark mode. These preferences are saved automatically.',
          },
        ],
      },
      dashboard: {
        title: 'Dashboard',
        items: [
          {
            title: 'Welcome Banner',
            description: 'Displays your name, role, and a quick action button to create a new quote.',
          },
          {
            title: 'Recent Quotes',
            description: 'Shows your most recent saved quotes with route, carrier, and total price at a glance. Click "View All" to access the full quote history.',
          },
          {
            title: 'Weather Widget',
            description: 'Real-time weather conditions across 47 global ports and airports. Weather disruptions can affect shipping schedules.',
          },
          {
            title: 'Logistics News',
            description: 'Latest logistics industry updates, port disruptions, and important carrier announcements.',
          },
          {
            title: 'Exchange Rate Widget',
            description: 'Live exchange rates for USD, EUR, JPY, CNY, GBP, and SGD against KRW. Rates auto-refresh every 5 minutes.',
          },
          {
            title: 'Currency Calculator',
            description: 'Quick currency conversion tool on the sidebar. Select currencies and enter an amount to convert.',
          },
        ],
      },
      quoteCalculator: {
        title: 'Quote Calculator',
        items: [
          {
            title: '① Route & Delivery Terms',
            description: 'Select origin country, destination country, shipping zone, and delivery mode (Door-to-Door or Door-to-Airport). Enter the destination zip code for accurate pricing.',
          },
          {
            title: '② Cargo Details',
            description: 'Enter the number of boxes, dimensions (L x W x H in cm), and actual weight (kg). The system automatically calculates volumetric weight and applies packing adjustments (+10/+10/+15 cm).',
          },
          {
            title: '③ Additional Services',
            description: 'Configure Seoul pickup costs, review system-applied surcharges (AHS, large package, etc.), and add manual surcharges if needed. DHL now supports 6 additional add-ons including EMG, TSD, NSC, MWB, LBI, and LBM.',
          },
          {
            title: 'Special Packing Info',
            description: 'Selecting WOODEN_BOX, SKID, or VACUUM packing shows a detailed cost panel: material cost (surface area × ₩15,000/m²), labor (₩50,000/box, ₩75,000 vacuum), fumigation (₩30,000 fixed), and dimension/weight impact. AHS auto-detect warning is also shown.',
          },
          {
            title: 'UPS Surge Fee & EAS/RAS',
            description: 'For Middle East/Israel destinations, UPS Surge Fee (SGF) is auto-calculated. When entering a ZIP code, the system checks 86 countries and 39,876 postal ranges to detect Extended/Remote Area surcharges with one-click apply.',
          },
          {
            title: '④ Financial Settings',
            description: 'Review applied exchange rates and FSC percentages. The system uses live rates but allows admin overrides. Express shipments (UPS/DHL/EMAX) use DAP incoterm only.',
          },
          {
            title: 'Results & Comparison',
            description: 'View side-by-side carrier comparison cards showing UPS, DHL, and EMAX rates. Each card breaks down origin costs, freight, destination charges, and final price.',
          },
        ],
      },
      savingQuotes: {
        title: 'Saving Quotes',
        items: [
          {
            title: 'Save Button',
            description: 'Click "Save Quote" after calculating. The system generates a unique reference number (SQ-YYYY-NNNN) for tracking.',
          },
          {
            title: 'Adding Notes',
            description: 'Add internal notes or customer-specific instructions when saving. These notes are visible in the quote detail view.',
          },
          {
            title: 'Slack Notification',
            description: 'When a member saves a quote, an automatic Slack notification is sent to the team channel. This helps admins track member activity in real-time.',
          },
          {
            title: 'Quote Validity',
            description: 'Saved quotes have a validity period with color-coded indicators: green (>3 days), yellow (1–3 days), red (expired). Surcharge changes may also flag a quote for re-verification.',
          },
        ],
      },
      pdfExport: {
        title: 'PDF Export',
        items: [
          {
            title: 'Generating PDF',
            description: 'Click "Download PDF" on any saved quote to generate a professional quote document. The PDF includes route details, cost breakdown, disclaimers in Korean and English, and the rate date.',
          },
          {
            title: 'PDF Contents',
            description: 'The generated PDF includes: company header, reference number, origin/destination, itemized cost breakdown, packing type with cost sub-breakdown (material, labor, fumigation), carrier add-on details (SGF, EXT, RMT, etc.), applied margin, final price in KRW and USD, and validity disclaimers.',
          },
        ],
      },
      quoteHistory: {
        title: 'Quote History',
        items: [
          {
            title: 'Searching Quotes',
            description: 'Use the search bar to find quotes by reference number, destination country, or notes. The search works across all text fields.',
          },
          {
            title: 'Filtering',
            description: 'Filter quotes by destination country, date range, or status (confirmed/expired). Combine filters with search for precise results.',
          },
          {
            title: 'Quote Detail View',
            description: 'Click on any quote row to open the detail modal. View full cost breakdown, applied margin rules, notes, and surcharge status.',
          },
          {
            title: 'CSV Export',
            description: 'Export your quote history as a CSV file for external analysis. The export includes all visible columns and supports up to 10,000 records.',
          },
        ],
      },
      accountSettings: {
        title: 'Account Settings',
        items: [
          {
            title: 'Changing Password',
            description: 'Click the gear icon in the header to open Account Settings. Enter your current password, then your new password (minimum 6 characters) and confirm it.',
          },
          {
            title: 'Theme Preference',
            description: 'Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved in the browser.',
          },
          {
            title: 'Language Preference',
            description: 'Click the globe icon to switch languages. The system supports English, Korean, Japanese, and Chinese. Your choice persists across sessions.',
          },
        ],
      },
      adminOverview: {
        title: 'Admin Panel Overview',
        items: [
          {
            title: 'Accessing Admin Panel',
            description: 'Admin users see an "Admin Panel" link in the header. The admin view provides the same quote calculator plus additional management widgets below.',
          },
          {
            title: 'Admin Widgets',
            description: 'The admin panel includes: Margin Rules, FSC Rates, Surcharge Management, Customer Management, User Management, Rate Table Viewer, and Audit Log.',
          },
          {
            title: 'Margin Visibility',
            description: 'Only admin users can see the margin breakdown and pricing strategy sections in the quote results. Members see final prices only.',
          },
        ],
      },
      marginRules: {
        title: 'Margin Rules Management',
        items: [
          {
            title: 'Priority System',
            description: 'Margin rules follow a priority-based resolution: P100 (per-user flat rate, highest priority) > P90 (per-user weight-based) > P50 (nationality-based) > P0 (default fallback). The first matching rule wins.',
          },
          {
            title: 'Creating Rules',
            description: 'Click "Add Rule" to create a new margin rule. Specify the priority tier, target (user email or nationality), margin percentage, and optional weight range for P90 rules.',
          },
          {
            title: 'Editing & Deleting',
            description: 'Click the edit icon to modify existing rules inline. Delete uses soft-delete to preserve audit history. All changes are logged in the Audit Log.',
          },
          {
            title: 'Rule Resolution',
            description: 'Use the "Test Resolve" feature to see which margin rule would apply for a specific user and weight combination. Results are cached for 5 minutes.',
          },
        ],
      },
      fscManagement: {
        title: 'FSC Rate Management',
        items: [
          {
            title: 'Viewing Current Rates',
            description: 'The FSC widget displays current fuel surcharge percentages for DHL and UPS, both international and domestic. Each rate shows its last update date.',
          },
          {
            title: 'Updating Rates',
            description: 'Enter new FSC percentages and save. Changes take effect immediately for all new calculations. External verification links are provided for cross-checking with official carrier pages.',
          },
          {
            title: 'Rate Impact',
            description: 'FSC is applied as a percentage on top of the base carrier freight rate. A change in FSC directly affects all quote calculations.',
          },
        ],
      },
      surchargeManagement: {
        title: 'Surcharge Management',
        items: [
          {
            title: 'Active Surcharges',
            description: 'View all currently active surcharges in a table format. Each entry shows the surcharge name, carrier, type (percentage or flat), amount, and effective dates.',
          },
          {
            title: 'Adding Surcharges',
            description: 'Use the form to add carrier-specific surcharges. Specify the carrier, surcharge name, type (percentage or flat amount), value, and optional start/end dates.',
          },
          {
            title: 'Carrier Links',
            description: 'Quick links to official UPS and DHL surcharge announcement pages for verification.',
          },
          {
            title: 'Important Notice',
            description: 'Surcharges are manually updated based on official carrier announcements. They are not auto-synced. Always verify with official pages before finalizing quotes.',
          },
        ],
      },
      customerManagement: {
        title: 'Customer Management',
        items: [
          {
            title: 'Customer List',
            description: 'View all registered customers with their company name, contact information, and quote count badges showing activity level.',
          },
          {
            title: 'Adding Customers',
            description: 'Create customer records with company name, contact person, email, and phone number. Customer records can be linked to saved quotes.',
          },
          {
            title: 'Customer Quotes',
            description: 'View all quotes associated with a specific customer. This helps track customer activity and pricing history.',
          },
        ],
      },
      userManagement: {
        title: 'User Management',
        items: [
          {
            title: 'User List',
            description: 'View all registered users with their name, email, company, nationality, network memberships, and role (admin/member).',
          },
          {
            title: 'Editing Users',
            description: 'Click "Edit" to modify user details including role, company, nationality, and network memberships. Changes are saved immediately and logged.',
          },
          {
            title: 'Search & Filter',
            description: 'Use the search bar to find users by name, email, or company name.',
          },
        ],
      },
      rateTableViewer: {
        title: 'Rate Table Viewer',
        items: [
          {
            title: 'Viewing Rate Tables',
            description: 'Browse carrier-specific rate tables (UPS, DHL, EMAX) in a read-only format. Tables show weight-based pricing across all shipping zones.',
          },
          {
            title: 'Zone Reference',
            description: 'Each carrier has its own zone mapping. The viewer shows which countries belong to each zone for reference during quoting.',
          },
        ],
      },
      auditLog: {
        title: 'Audit Log',
        items: [
          {
            title: 'Viewing Audit Logs',
            description: 'All admin actions (margin rule changes, FSC updates, surcharge modifications, user edits) are recorded with timestamp, user, action type, and details.',
          },
          {
            title: 'Search & Filter',
            description: 'Filter audit logs by date range, action type, or user. Use the search bar to find specific entries.',
          },
          {
            title: 'Compliance',
            description: 'The audit log provides a complete trail of all configuration changes for compliance and accountability purposes.',
          },
        ],
      },
    },
  },

  ko: {
    pageTitle: '사용자 가이드',
    tocTitle: '목차',
    adminBadge: '관리자',
    memberBadge: '회원',
    tipLabel: '팁',
    noteLabel: '참고',
    shortcutLabel: '단축키',
    screenshotPlaceholder: '[스크린샷: %s]',
    sections: {
      gettingStarted: {
        title: '시작하기',
        items: [
          {
            title: '계정 만들기',
            description: '우측 상단의 "회원가입"을 클릭하세요. 이메일, 비밀번호, 회사명, 이름, 국적을 입력하고, 선택적으로 물류 네트워크 가입 여부(WCA, MPL, EAN, JCtrans)를 선택합니다. 등록 후 즉시 계정이 활성화됩니다.',
          },
          {
            title: '로그인',
            description: '"로그인"을 클릭하고 등록된 이메일과 비밀번호를 입력하세요. 시스템은 세션 간 언어 설정과 테마 설정을 기억합니다.',
          },
          {
            title: '언어 및 테마',
            description: '지구본 아이콘으로 영어, 한국어, 일본어, 중국어 간 전환할 수 있습니다. 달/해 아이콘으로 다크 모드를 토글합니다. 이 설정은 자동으로 저장됩니다.',
          },
        ],
      },
      dashboard: {
        title: '대시보드',
        items: [
          {
            title: '환영 배너',
            description: '이름, 역할, 그리고 새 견적을 만들 수 있는 빠른 액션 버튼이 표시됩니다.',
          },
          {
            title: '최근 견적',
            description: '최근 저장된 견적의 경로, 운송사, 총 가격을 한눈에 보여줍니다. "전체 보기"를 클릭하면 전체 견적 내역에 접근할 수 있습니다.',
          },
          {
            title: '날씨 위젯',
            description: '전 세계 47개 주요 항구 및 공항의 실시간 기상 상황을 제공합니다. 기상 이변은 배송 일정에 영향을 줄 수 있습니다.',
          },
          {
            title: '물류 뉴스',
            description: '최신 물류 업계 동향, 항만 장애, 주요 운송사 공지사항을 제공합니다.',
          },
          {
            title: '환율 위젯',
            description: 'USD, EUR, JPY, CNY, GBP, SGD의 KRW 대비 실시간 환율을 표시합니다. 5분마다 자동 갱신됩니다.',
          },
          {
            title: '환율 계산기',
            description: '사이드바의 빠른 환율 변환 도구입니다. 통화를 선택하고 금액을 입력하면 바로 변환됩니다.',
          },
        ],
      },
      quoteCalculator: {
        title: '견적 계산기',
        items: [
          {
            title: '① 경로 및 배송 조건',
            description: '출발국, 도착국, 배송 존, 배송 모드(Door-to-Door 또는 Door-to-Airport)를 선택합니다. 정확한 가격 산출을 위해 도착지 우편번호를 입력하세요.',
          },
          {
            title: '② 화물 상세',
            description: '박스 수, 치수(L x W x H, cm), 실중량(kg)을 입력합니다. 시스템이 자동으로 부피중량을 계산하고 포장 조정값(+10/+10/+15cm)을 적용합니다.',
          },
          {
            title: '③ 부가 서비스',
            description: '서울 픽업 비용을 설정하고, 시스템 적용 할증료(AHS, 대형 화물 등)를 확인하며, 필요 시 수동 할증료를 추가할 수 있습니다. DHL은 EMG, TSD, NSC, MWB, LBI, LBM 등 6개 부가서비스가 추가되었습니다.',
          },
          {
            title: '특수 포장 정보',
            description: 'WOODEN_BOX, SKID, VACUUM 포장 선택 시 상세 비용 패널이 표시됩니다: 재료비(표면적 × ₩15,000/m²), 인건비(₩50,000/박스, 진공 ₩75,000), 훈증비(₩30,000 고정), 치수/중량 영향. AHS 자동 감지 경고도 표시됩니다.',
          },
          {
            title: 'UPS Surge Fee & EAS/RAS',
            description: '중동/이스라엘 도착지의 경우 UPS Surge Fee(SGF)가 자동 계산됩니다. 우편번호 입력 시 86개국 39,876개 우편번호 범위를 자동으로 확인하여 원격지/확장 지역 할증료를 감지하고 원클릭 적용할 수 있습니다.',
          },
          {
            title: '④ 재무 설정',
            description: '적용된 환율과 FSC 비율을 확인합니다. 시스템은 실시간 환율을 사용하지만 관리자 수동 설정도 가능합니다. 특송(UPS/DHL/EMAX)은 DAP 인코텀만 적용됩니다.',
          },
          {
            title: '결과 및 비교',
            description: 'UPS, DHL, EMAX 요율을 나란히 비교하는 카드를 확인하세요. 각 카드에는 출발지 비용, 운임, 도착지 비용, 최종 가격이 표시됩니다.',
          },
        ],
      },
      savingQuotes: {
        title: '견적 저장',
        items: [
          {
            title: '저장 버튼',
            description: '계산 후 "견적 저장"을 클릭합니다. 시스템이 추적용 고유 참조번호(SQ-YYYY-NNNN)를 생성합니다.',
          },
          {
            title: '메모 추가',
            description: '저장 시 내부 메모나 고객별 지시사항을 추가할 수 있습니다. 이 메모는 견적 상세 보기에서 확인 가능합니다.',
          },
          {
            title: 'Slack 알림',
            description: '회원이 견적을 저장하면 팀 채널에 자동으로 Slack 알림이 전송됩니다. 이를 통해 관리자가 회원 활동을 실시간으로 추적할 수 있습니다.',
          },
          {
            title: '견적 유효기간',
            description: '저장된 견적에는 유효기간이 있으며 색상 코드로 표시됩니다: 초록색(3일 이상), 노란색(1~3일), 빨간색(만료). 할증료 변경 시에도 재확인 필요 플래그가 표시될 수 있습니다.',
          },
        ],
      },
      pdfExport: {
        title: 'PDF 내보내기',
        items: [
          {
            title: 'PDF 생성',
            description: '저장된 견적에서 "PDF 다운로드"를 클릭하면 전문적인 견적서가 생성됩니다. PDF에는 경로 상세, 비용 내역, 한국어/영어 면책조항, 기준일이 포함됩니다.',
          },
          {
            title: 'PDF 내용',
            description: '생성된 PDF에는 회사 헤더, 참조번호, 출발지/도착지, 항목별 비용 내역, 포장 유형 및 세부 비용(재료비, 인건비, 훈증비), 운송사 부가서비스 내역(SGF, EXT, RMT 등), 적용 마진, KRW 및 USD 최종 가격, 유효기간 면책조항이 포함됩니다.',
          },
        ],
      },
      quoteHistory: {
        title: '견적 내역',
        items: [
          {
            title: '견적 검색',
            description: '검색창을 사용하여 참조번호, 도착국, 메모로 견적을 찾을 수 있습니다. 모든 텍스트 필드에서 검색이 작동합니다.',
          },
          {
            title: '필터링',
            description: '도착국, 기간, 상태(확정/만료)로 견적을 필터링합니다. 검색과 필터를 결합하면 정확한 결과를 얻을 수 있습니다.',
          },
          {
            title: '견적 상세 보기',
            description: '견적 행을 클릭하면 상세 모달이 열립니다. 전체 비용 내역, 적용된 마진 규칙, 메모, 할증료 상태를 확인할 수 있습니다.',
          },
          {
            title: 'CSV 내보내기',
            description: '외부 분석을 위해 견적 내역을 CSV 파일로 내보낼 수 있습니다. 표시된 모든 열이 포함되며 최대 10,000건까지 지원합니다.',
          },
        ],
      },
      accountSettings: {
        title: '계정 설정',
        items: [
          {
            title: '비밀번호 변경',
            description: '헤더의 톱니바퀴 아이콘을 클릭하여 계정 설정을 엽니다. 현재 비밀번호를 입력한 후 새 비밀번호(최소 6자)를 입력하고 확인합니다.',
          },
          {
            title: '테마 설정',
            description: '헤더의 해/달 아이콘으로 라이트/다크 모드를 전환합니다. 설정은 브라우저에 저장됩니다.',
          },
          {
            title: '언어 설정',
            description: '지구본 아이콘을 클릭하여 언어를 전환합니다. 영어, 한국어, 일본어, 중국어를 지원합니다. 선택한 언어는 세션 간 유지됩니다.',
          },
        ],
      },
      adminOverview: {
        title: '관리자 패널 개요',
        items: [
          {
            title: '관리자 패널 접근',
            description: '관리자는 헤더에 "관리자 패널" 링크가 표시됩니다. 관리자 뷰에서는 동일한 견적 계산기에 추가 관리 위젯이 아래에 표시됩니다.',
          },
          {
            title: '관리자 위젯',
            description: '관리자 패널에는 마진 규칙, FSC 요율, 할증료 관리, 고객 관리, 사용자 관리, 요율표 뷰어, 감사 로그가 포함됩니다.',
          },
          {
            title: '마진 표시',
            description: '관리자만 견적 결과에서 마진 내역과 가격 전략 섹션을 볼 수 있습니다. 회원은 최종 가격만 볼 수 있습니다.',
          },
        ],
      },
      marginRules: {
        title: '마진 규칙 관리',
        items: [
          {
            title: '우선순위 시스템',
            description: '마진 규칙은 우선순위 기반으로 적용됩니다: P100(사용자별 고정 요율, 최고 우선순위) > P90(사용자별 중량 기반) > P50(국적 기반) > P0(기본값). 첫 번째 일치 규칙이 적용됩니다.',
          },
          {
            title: '규칙 생성',
            description: '"규칙 추가"를 클릭하여 새 마진 규칙을 생성합니다. 우선순위 등급, 대상(사용자 이메일 또는 국적), 마진 비율, P90 규칙의 선택적 중량 범위를 지정합니다.',
          },
          {
            title: '수정 및 삭제',
            description: '수정 아이콘을 클릭하여 기존 규칙을 인라인으로 수정합니다. 삭제는 감사 이력 보존을 위해 소프트 삭제를 사용합니다. 모든 변경사항은 감사 로그에 기록됩니다.',
          },
          {
            title: '규칙 해석',
            description: '"테스트 해석" 기능을 사용하여 특정 사용자와 중량 조합에 어떤 마진 규칙이 적용되는지 확인할 수 있습니다. 결과는 5분간 캐시됩니다.',
          },
        ],
      },
      fscManagement: {
        title: 'FSC 요율 관리',
        items: [
          {
            title: '현재 요율 확인',
            description: 'FSC 위젯은 DHL과 UPS의 현재 유류할증료 비율(국제/국내)을 표시합니다. 각 요율의 마지막 업데이트 날짜가 함께 표시됩니다.',
          },
          {
            title: '요율 업데이트',
            description: '새로운 FSC 비율을 입력하고 저장합니다. 변경사항은 즉시 모든 새로운 계산에 적용됩니다. 공식 운송사 페이지와 교차 확인을 위한 외부 링크가 제공됩니다.',
          },
          {
            title: '요율 영향',
            description: 'FSC는 기본 운송사 운임에 백분율로 적용됩니다. FSC 변경은 모든 견적 계산에 직접 영향을 미칩니다.',
          },
        ],
      },
      surchargeManagement: {
        title: '할증료 관리',
        items: [
          {
            title: '활성 할증료',
            description: '현재 활성화된 모든 할증료를 테이블 형식으로 확인합니다. 각 항목은 할증료명, 운송사, 유형(비율 또는 정액), 금액, 유효기간을 표시합니다.',
          },
          {
            title: '할증료 추가',
            description: '양식을 사용하여 운송사별 할증료를 추가합니다. 운송사, 할증료명, 유형(비율 또는 정액), 값, 선택적 시작/종료일을 지정합니다.',
          },
          {
            title: '운송사 링크',
            description: 'UPS와 DHL 공식 할증료 공지 페이지로의 빠른 링크를 제공합니다.',
          },
          {
            title: '중요 안내',
            description: '할증료는 공식 운송사 공지를 기반으로 수동 업데이트됩니다. 자동 동기화되지 않으므로 견적 확정 전 반드시 공식 페이지에서 확인하세요.',
          },
        ],
      },
      customerManagement: {
        title: '고객 관리',
        items: [
          {
            title: '고객 목록',
            description: '등록된 모든 고객의 회사명, 연락처, 활동 수준을 나타내는 견적 수 배지를 확인합니다.',
          },
          {
            title: '고객 추가',
            description: '회사명, 담당자, 이메일, 전화번호로 고객 기록을 생성합니다. 고객 기록은 저장된 견적에 연결할 수 있습니다.',
          },
          {
            title: '고객별 견적',
            description: '특정 고객과 연결된 모든 견적을 확인합니다. 고객 활동과 가격 이력을 추적하는 데 도움이 됩니다.',
          },
        ],
      },
      userManagement: {
        title: '사용자 관리',
        items: [
          {
            title: '사용자 목록',
            description: '등록된 모든 사용자의 이름, 이메일, 회사, 국적, 네트워크 가입 여부, 역할(관리자/회원)을 확인합니다.',
          },
          {
            title: '사용자 수정',
            description: '"수정"을 클릭하여 역할, 회사, 국적, 네트워크 가입 여부를 포함한 사용자 세부정보를 수정합니다. 변경사항은 즉시 저장되고 기록됩니다.',
          },
          {
            title: '검색 및 필터',
            description: '검색창을 사용하여 이름, 이메일, 회사명으로 사용자를 찾습니다.',
          },
        ],
      },
      rateTableViewer: {
        title: '요율표 뷰어',
        items: [
          {
            title: '요율표 보기',
            description: '운송사별 요율표(UPS, DHL, EMAX)를 읽기 전용으로 탐색합니다. 모든 배송 존에 대한 중량별 가격이 표시됩니다.',
          },
          {
            title: '존 참조',
            description: '각 운송사는 고유한 존 매핑을 가지고 있습니다. 뷰어에서 견적 작성 시 참고용으로 각 존에 속하는 국가를 확인할 수 있습니다.',
          },
        ],
      },
      auditLog: {
        title: '감사 로그',
        items: [
          {
            title: '감사 로그 보기',
            description: '모든 관리자 작업(마진 규칙 변경, FSC 업데이트, 할증료 수정, 사용자 편집)이 타임스탬프, 사용자, 작업 유형, 세부사항과 함께 기록됩니다.',
          },
          {
            title: '검색 및 필터',
            description: '기간, 작업 유형, 사용자별로 감사 로그를 필터링합니다. 검색창으로 특정 항목을 찾습니다.',
          },
          {
            title: '컴플라이언스',
            description: '감사 로그는 컴플라이언스와 책임 추적을 위해 모든 설정 변경의 완전한 기록을 제공합니다.',
          },
        ],
      },
    },
  },

  cn: {
    pageTitle: '使用指南',
    tocTitle: '目录',
    adminBadge: '管理员',
    memberBadge: '会员',
    tipLabel: '提示',
    noteLabel: '注意',
    shortcutLabel: '快捷键',
    screenshotPlaceholder: '[截图: %s]',
    sections: {
      gettingStarted: {
        title: '入门指南',
        items: [
          {
            title: '创建账户',
            description: '点击右上角的"注册"。填写邮箱、密码、公司名称、姓名、国籍，并可选择您的物流网络会员身份（WCA、MPL、EAN、JCtrans）。注册后账户将立即激活。',
          },
          {
            title: '登录',
            description: '点击"登录"，输入注册邮箱和密码。系统会在会话间记住您的语言和主题偏好。',
          },
          {
            title: '语言和主题',
            description: '使用地球图标在英语、韩语、日语和中文之间切换。使用月亮/太阳图标切换暗黑模式。这些设置会自动保存。',
          },
        ],
      },
      dashboard: {
        title: '仪表盘',
        items: [
          {
            title: '欢迎横幅',
            description: '显示您的姓名、角色和创建新报价的快捷按钮。',
          },
          {
            title: '最近报价',
            description: '一目了然地显示最近保存的报价的路线、承运商和总价。点击"查看全部"可访问完整的报价历史。',
          },
          {
            title: '天气插件',
            description: '提供全球47个主要港口和机场的实时天气状况。天气异常可能影响运输时间表。',
          },
          {
            title: '物流新闻',
            description: '最新的物流行业动态、港口中断和重要承运商公告。',
          },
          {
            title: '汇率插件',
            description: 'USD、EUR、JPY、CNY、GBP、SGD兑KRW的实时汇率。每5分钟自动刷新。',
          },
          {
            title: '汇率计算器',
            description: '侧边栏的快速货币转换工具。选择货币并输入金额即可转换。',
          },
        ],
      },
      quoteCalculator: {
        title: '报价计算器',
        items: [
          {
            title: '① 路线与交货条件',
            description: '选择始发国、目的国、运输区域和交货模式（门到门或门到机场）。输入目的地邮编以获取准确报价。',
          },
          {
            title: '② 货物详情',
            description: '输入箱数、尺寸（长 x 宽 x 高，厘米）和实际重量（公斤）。系统自动计算体积重量并应用包装调整值（+10/+10/+15厘米）。',
          },
          {
            title: '③ 附加服务',
            description: '设置首尔取货费用，查看系统自动应用的附加费（AHS、大件等），如需可手动添加附加费。DHL新增6项附加服务：EMG、TSD、NSC、MWB、LBI、LBM。',
          },
          {
            title: '特殊包装信息',
            description: '选择WOODEN_BOX、SKID或VACUUM包装时显示详细费用面板：材料费（表面积 × ₩15,000/m²）、人工费（₩50,000/箱，真空₩75,000）、熏蒸费（₩30,000固定）、尺寸/重量影响。还会显示AHS自动检测警告。',
          },
          {
            title: 'UPS Surge Fee & EAS/RAS',
            description: '中东/以色列目的地会自动计算UPS Surge Fee（SGF）。输入邮编时，系统自动检查86个国家39,876个邮编范围，检测偏远/扩展区域附加费并支持一键应用。',
          },
          {
            title: '④ 财务设置',
            description: '查看应用的汇率和FSC百分比。系统使用实时汇率，但允许管理员手动覆盖。快递（UPS/DHL/EMAX）仅适用DAP贸易术语。',
          },
          {
            title: '结果与比较',
            description: '查看UPS、DHL、EMAX费率的并排比较卡片。每张卡片显示始发费用、运费、目的地费用和最终价格明细。',
          },
        ],
      },
      savingQuotes: {
        title: '保存报价',
        items: [
          {
            title: '保存按钮',
            description: '计算完成后点击"保存报价"。系统会生成唯一的参考编号（SQ-YYYY-NNNN）用于跟踪。',
          },
          {
            title: '添加备注',
            description: '保存时可添加内部备注或客户特定说明。这些备注在报价详情视图中可见。',
          },
          {
            title: 'Slack通知',
            description: '会员保存报价时，系统会自动向团队频道发送Slack通知。这有助于管理员实时跟踪会员活动。',
          },
          {
            title: '报价有效期',
            description: '保存的报价有有效期限，以颜色标识：绿色（>3天）、黄色（1-3天）、红色（已过期）。附加费变更也可能标记报价需要重新验证。',
          },
        ],
      },
      pdfExport: {
        title: 'PDF导出',
        items: [
          {
            title: '生成PDF',
            description: '在已保存的报价上点击"下载PDF"可生成专业报价文档。PDF包括路线详情、费用明细、韩英双语免责声明和费率日期。',
          },
          {
            title: 'PDF内容',
            description: '生成的PDF包含：公司抬头、参考编号、始发地/目的地、逐项费用明细、包装类型及费用细分（材料费、人工费、熏蒸费）、承运商附加服务明细（SGF、EXT、RMT等）、应用利润率、KRW和USD最终价格及有效期免责声明。',
          },
        ],
      },
      quoteHistory: {
        title: '报价历史',
        items: [
          {
            title: '搜索报价',
            description: '使用搜索栏按参考编号、目的国或备注查找报价。搜索功能适用于所有文本字段。',
          },
          {
            title: '筛选',
            description: '按目的国、日期范围或状态（已确认/已过期）筛选报价。将搜索与筛选结合可获得精确结果。',
          },
          {
            title: '报价详情',
            description: '点击任何报价行打开详情弹窗。查看完整费用明细、应用的利润规则、备注和附加费状态。',
          },
          {
            title: 'CSV导出',
            description: '将报价历史导出为CSV文件供外部分析。导出包含所有可见列，最多支持10,000条记录。',
          },
        ],
      },
      accountSettings: {
        title: '账户设置',
        items: [
          {
            title: '修改密码',
            description: '点击页眉的齿轮图标打开账户设置。输入当前密码，然后输入新密码（至少6个字符）并确认。',
          },
          {
            title: '主题偏好',
            description: '使用页眉的太阳/月亮图标在浅色和深色模式之间切换。您的偏好保存在浏览器中。',
          },
          {
            title: '语言偏好',
            description: '点击地球图标切换语言。系统支持英语、韩语、日语和中文。您的选择会在会话间保持。',
          },
        ],
      },
      adminOverview: {
        title: '管理面板概览',
        items: [
          {
            title: '访问管理面板',
            description: '管理员用户会在页眉看到"管理面板"链接。管理视图提供相同的报价计算器，以及下方的额外管理插件。',
          },
          {
            title: '管理插件',
            description: '管理面板包含：利润规则、FSC费率、附加费管理、客户管理、用户管理、费率表查看器和审计日志。',
          },
          {
            title: '利润可见性',
            description: '只有管理员可以在报价结果中看到利润明细和定价策略部分。会员只能看到最终价格。',
          },
        ],
      },
      marginRules: {
        title: '利润规则管理',
        items: [
          {
            title: '优先级系统',
            description: '利润规则按优先级解析：P100（每用户固定费率，最高优先级）> P90（每用户基于重量）> P50（基于国籍）> P0（默认值）。第一个匹配的规则生效。',
          },
          {
            title: '创建规则',
            description: '点击"添加规则"创建新的利润规则。指定优先级等级、目标（用户邮箱或国籍）、利润百分比，以及P90规则的可选重量范围。',
          },
          {
            title: '编辑与删除',
            description: '点击编辑图标可内联修改现有规则。删除使用软删除以保留审计历史。所有变更记录在审计日志中。',
          },
          {
            title: '规则解析',
            description: '使用"测试解析"功能查看特定用户和重量组合适用哪条利润规则。结果缓存5分钟。',
          },
        ],
      },
      fscManagement: {
        title: 'FSC费率管理',
        items: [
          {
            title: '查看当前费率',
            description: 'FSC插件显示DHL和UPS当前的燃油附加费百分比（国际/国内）。每个费率显示最后更新日期。',
          },
          {
            title: '更新费率',
            description: '输入新的FSC百分比并保存。变更立即应用于所有新计算。提供外部验证链接以与官方承运商页面交叉核对。',
          },
          {
            title: '费率影响',
            description: 'FSC作为基础承运商运费的百分比应用。FSC变更直接影响所有报价计算。',
          },
        ],
      },
      surchargeManagement: {
        title: '附加费管理',
        items: [
          {
            title: '当前附加费',
            description: '以表格形式查看所有当前有效的附加费。每条记录显示附加费名称、承运商、类型（百分比或固定金额）、金额和有效日期。',
          },
          {
            title: '添加附加费',
            description: '使用表单添加承运商特定附加费。指定承运商、附加费名称、类型（百分比或固定金额）、值和可选的起止日期。',
          },
          {
            title: '承运商链接',
            description: '提供UPS和DHL官方附加费公告页面的快速链接供核实。',
          },
          {
            title: '重要通知',
            description: '附加费根据承运商官方公告手动更新，不自动同步。请在最终确认报价前务必在官方页面核实。',
          },
        ],
      },
      customerManagement: {
        title: '客户管理',
        items: [
          {
            title: '客户列表',
            description: '查看所有注册客户的公司名称、联系信息和显示活跃度的报价数量徽章。',
          },
          {
            title: '添加客户',
            description: '创建包含公司名称、联系人、邮箱和电话号码的客户记录。客户记录可关联到已保存的报价。',
          },
          {
            title: '客户报价',
            description: '查看与特定客户关联的所有报价。有助于跟踪客户活动和定价历史。',
          },
        ],
      },
      userManagement: {
        title: '用户管理',
        items: [
          {
            title: '用户列表',
            description: '查看所有注册用户的姓名、邮箱、公司、国籍、网络会员身份和角色（管理员/会员）。',
          },
          {
            title: '编辑用户',
            description: '点击"编辑"修改用户详情，包括角色、公司、国籍和网络会员身份。变更立即保存并记录。',
          },
          {
            title: '搜索与筛选',
            description: '使用搜索栏按姓名、邮箱或公司名称查找用户。',
          },
        ],
      },
      rateTableViewer: {
        title: '费率表查看器',
        items: [
          {
            title: '查看费率表',
            description: '以只读格式浏览承运商特定费率表（UPS、DHL、EMAX）。表格显示所有运输区域的基于重量的定价。',
          },
          {
            title: '区域参考',
            description: '每个承运商有自己的区域映射。查看器显示每个区域包含哪些国家，供报价时参考。',
          },
        ],
      },
      auditLog: {
        title: '审计日志',
        items: [
          {
            title: '查看审计日志',
            description: '所有管理员操作（利润规则变更、FSC更新、附加费修改、用户编辑）均记录时间戳、用户、操作类型和详情。',
          },
          {
            title: '搜索与筛选',
            description: '按日期范围、操作类型或用户筛选审计日志。使用搜索栏查找特定条目。',
          },
          {
            title: '合规性',
            description: '审计日志提供所有配置变更的完整记录，用于合规和问责目的。',
          },
        ],
      },
    },
  },

  ja: {
    pageTitle: 'ユーザーガイド',
    tocTitle: '目次',
    adminBadge: '管理者',
    memberBadge: 'メンバー',
    tipLabel: 'ヒント',
    noteLabel: '注意',
    shortcutLabel: 'ショートカット',
    screenshotPlaceholder: '[スクリーンショット: %s]',
    sections: {
      gettingStarted: {
        title: 'はじめに',
        items: [
          {
            title: 'アカウント作成',
            description: '右上の「新規登録」をクリックしてください。メールアドレス、パスワード、会社名、氏名、国籍を入力し、任意で物流ネットワーク会員資格（WCA、MPL、EAN、JCtrans）を選択します。登録後すぐにアカウントが有効になります。',
          },
          {
            title: 'ログイン',
            description: '「ログイン」をクリックし、登録済みのメールアドレスとパスワードを入力してください。システムはセッション間で言語設定とテーマ設定を記憶します。',
          },
          {
            title: '言語とテーマ',
            description: '地球アイコンで英語、韓国語、日本語、中国語を切り替えられます。月/太陽アイコンでダークモードを切り替えます。これらの設定は自動的に保存されます。',
          },
        ],
      },
      dashboard: {
        title: 'ダッシュボード',
        items: [
          {
            title: 'ウェルカムバナー',
            description: '名前、役割、新しい見積もりを作成するクイックアクションボタンが表示されます。',
          },
          {
            title: '最近の見積もり',
            description: '最近保存した見積もりのルート、キャリア、合計金額を一覧表示します。「すべて表示」をクリックすると、完全な見積もり履歴にアクセスできます。',
          },
          {
            title: '天気ウィジェット',
            description: '世界47の主要港湾・空港のリアルタイム気象状況を提供します。気象の混乱は配送スケジュールに影響を与える可能性があります。',
          },
          {
            title: '物流ニュース',
            description: '最新の物流業界の動向、港湾障害、重要なキャリアのお知らせを提供します。',
          },
          {
            title: '為替レートウィジェット',
            description: 'USD、EUR、JPY、CNY、GBP、SGDのKRW対比リアルタイム為替レートを表示します。5分ごとに自動更新されます。',
          },
          {
            title: '為替計算機',
            description: 'サイドバーのクイック通貨変換ツールです。通貨を選択して金額を入力すると即座に変換されます。',
          },
        ],
      },
      quoteCalculator: {
        title: '見積もり計算機',
        items: [
          {
            title: '① ルートと配送条件',
            description: '発送元国、配送先国、配送ゾーン、配送モード（Door-to-DoorまたはDoor-to-Airport）を選択します。正確な価格算出のため配送先の郵便番号を入力してください。',
          },
          {
            title: '② 貨物詳細',
            description: '箱数、寸法（縦 x 横 x 高さ、cm）、実重量（kg）を入力します。システムが自動的に容積重量を計算し、梱包調整値（+10/+10/+15cm）を適用します。',
          },
          {
            title: '③ 付加サービス',
            description: 'ソウル集荷費用を設定し、システム適用のサーチャージ（AHS、大型荷物など）を確認し、必要に応じて手動サーチャージを追加できます。DHLはEMG、TSD、NSC、MWB、LBI、LBMなど6つの付加サービスが追加されました。',
          },
          {
            title: '特殊梱包情報',
            description: 'WOODEN_BOX、SKID、VACUUM梱包選択時に詳細コストパネルが表示されます：材料費（表面積 × ₩15,000/m²）、人件費（₩50,000/箱、真空₩75,000）、燻蒸費（₩30,000固定）、寸法/重量への影響。AHS自動検出警告も表示されます。',
          },
          {
            title: 'UPS Surge Fee & EAS/RAS',
            description: '中東/イスラエル向けの場合、UPS Surge Fee（SGF）が自動計算されます。郵便番号入力時、86カ国39,876の郵便番号範囲を自動チェックし、遠隔地/拡張エリアサーチャージをワンクリックで適用できます。',
          },
          {
            title: '④ 財務設定',
            description: '適用された為替レートとFSC率を確認します。システムはリアルタイムレートを使用しますが、管理者による手動設定も可能です。エクスプレス（UPS/DHL/EMAX）はDAPインコタームのみ適用されます。',
          },
          {
            title: '結果と比較',
            description: 'UPS、DHL、EMAXの料率を横並びで比較するカードを確認します。各カードには発送元費用、運賃、配送先費用、最終価格が表示されます。',
          },
        ],
      },
      savingQuotes: {
        title: '見積もり保存',
        items: [
          {
            title: '保存ボタン',
            description: '計算後「見積もり保存」をクリックします。システムが追跡用の一意な参照番号（SQ-YYYY-NNNN）を生成します。',
          },
          {
            title: 'メモ追加',
            description: '保存時に内部メモや顧客固有の指示事項を追加できます。これらのメモは見積もり詳細ビューで確認できます。',
          },
          {
            title: 'Slack通知',
            description: 'メンバーが見積もりを保存すると、チームチャンネルに自動的にSlack通知が送信されます。これにより管理者がメンバーの活動をリアルタイムで追跡できます。',
          },
          {
            title: '見積もり有効期限',
            description: '保存された見積もりには有効期限があり、カラーコードで表示されます：緑（3日以上）、黄色（1〜3日）、赤（期限切れ）。サーチャージの変更により、再確認フラグが表示されることもあります。',
          },
        ],
      },
      pdfExport: {
        title: 'PDFエクスポート',
        items: [
          {
            title: 'PDF生成',
            description: '保存済み見積もりの「PDFダウンロード」をクリックすると、プロフェッショナルな見積書が生成されます。PDFにはルート詳細、費用内訳、韓国語/英語の免責事項、レート基準日が含まれます。',
          },
          {
            title: 'PDF内容',
            description: '生成されるPDFには、会社ヘッダー、参照番号、発送元/配送先、項目別費用内訳、梱包タイプと費用内訳（材料費、人件費、燻蒸費）、キャリア付加サービス詳細（SGF、EXT、RMTなど）、適用マージン、KRWおよびUSDの最終価格、有効期限の免責事項が含まれます。',
          },
        ],
      },
      quoteHistory: {
        title: '見積もり履歴',
        items: [
          {
            title: '見積もり検索',
            description: '検索バーを使用して参照番号、配送先国、メモで見積もりを検索できます。すべてのテキストフィールドで検索が機能します。',
          },
          {
            title: 'フィルタリング',
            description: '配送先国、期間、ステータス（確認済み/期限切れ）で見積もりをフィルタリングします。検索とフィルターを組み合わせると正確な結果が得られます。',
          },
          {
            title: '見積もり詳細',
            description: '見積もり行をクリックすると詳細モーダルが開きます。完全な費用内訳、適用されたマージンルール、メモ、サーチャージ状態を確認できます。',
          },
          {
            title: 'CSVエクスポート',
            description: '外部分析のために見積もり履歴をCSVファイルとしてエクスポートできます。表示されているすべての列が含まれ、最大10,000件までサポートします。',
          },
        ],
      },
      accountSettings: {
        title: 'アカウント設定',
        items: [
          {
            title: 'パスワード変更',
            description: 'ヘッダーの歯車アイコンをクリックしてアカウント設定を開きます。現在のパスワードを入力し、新しいパスワード（最低6文字）を入力して確認します。',
          },
          {
            title: 'テーマ設定',
            description: 'ヘッダーの太陽/月アイコンでライト/ダークモードを切り替えます。設定はブラウザに保存されます。',
          },
          {
            title: '言語設定',
            description: '地球アイコンをクリックして言語を切り替えます。英語、韓国語、日本語、中国語に対応しています。選択した言語はセッション間で保持されます。',
          },
        ],
      },
      adminOverview: {
        title: '管理パネル概要',
        items: [
          {
            title: '管理パネルへのアクセス',
            description: '管理者ユーザーにはヘッダーに「管理パネル」リンクが表示されます。管理ビューでは同じ見積もり計算機に加えて、下部に追加の管理ウィジェットが表示されます。',
          },
          {
            title: '管理ウィジェット',
            description: '管理パネルには、マージンルール、FSCレート、サーチャージ管理、顧客管理、ユーザー管理、レートテーブルビューアー、監査ログが含まれます。',
          },
          {
            title: 'マージン表示',
            description: '管理者のみが見積もり結果のマージン内訳と価格戦略セクションを確認できます。メンバーは最終価格のみ表示されます。',
          },
        ],
      },
      marginRules: {
        title: 'マージンルール管理',
        items: [
          {
            title: '優先順位システム',
            description: 'マージンルールは優先順位に基づいて適用されます：P100（ユーザー別固定レート、最高優先）> P90（ユーザー別重量ベース）> P50（国籍ベース）> P0（デフォルト）。最初に一致するルールが適用されます。',
          },
          {
            title: 'ルール作成',
            description: '「ルール追加」をクリックして新しいマージンルールを作成します。優先順位ティア、対象（ユーザーメールまたは国籍）、マージン率、P90ルールのオプション重量範囲を指定します。',
          },
          {
            title: '編集と削除',
            description: '編集アイコンをクリックして既存ルールをインラインで修正します。削除は監査履歴保持のためソフトデリートを使用します。すべての変更は監査ログに記録されます。',
          },
          {
            title: 'ルール解析',
            description: '「テスト解析」機能を使用して、特定のユーザーと重量の組み合わせにどのマージンルールが適用されるかを確認できます。結果は5分間キャッシュされます。',
          },
        ],
      },
      fscManagement: {
        title: 'FSCレート管理',
        items: [
          {
            title: '現在のレート確認',
            description: 'FSCウィジェットはDHLとUPSの現在の燃料サーチャージ率（国際/国内）を表示します。各レートの最終更新日も表示されます。',
          },
          {
            title: 'レート更新',
            description: '新しいFSC率を入力して保存します。変更はすべての新しい計算に即座に適用されます。公式キャリアページとの照合用に外部検証リンクが提供されます。',
          },
          {
            title: 'レートの影響',
            description: 'FSCは基本キャリア運賃にパーセンテージとして適用されます。FSCの変更はすべての見積もり計算に直接影響します。',
          },
        ],
      },
      surchargeManagement: {
        title: 'サーチャージ管理',
        items: [
          {
            title: '有効なサーチャージ',
            description: '現在有効なすべてのサーチャージをテーブル形式で確認します。各エントリにはサーチャージ名、キャリア、タイプ（パーセンテージまたは定額）、金額、有効期間が表示されます。',
          },
          {
            title: 'サーチャージ追加',
            description: 'フォームを使用してキャリア固有のサーチャージを追加します。キャリア、サーチャージ名、タイプ（パーセンテージまたは定額）、値、オプションの開始/終了日を指定します。',
          },
          {
            title: 'キャリアリンク',
            description: 'UPSとDHLの公式サーチャージ発表ページへのクイックリンクが提供されます。',
          },
          {
            title: '重要なお知らせ',
            description: 'サーチャージはキャリアの公式発表に基づいて手動更新されます。自動同期ではないため、見積もり確定前に必ず公式ページで確認してください。',
          },
        ],
      },
      customerManagement: {
        title: '顧客管理',
        items: [
          {
            title: '顧客リスト',
            description: '登録されたすべての顧客の会社名、連絡先情報、活動レベルを示す見積もり数バッジを確認します。',
          },
          {
            title: '顧客追加',
            description: '会社名、担当者、メール、電話番号で顧客レコードを作成します。顧客レコードは保存済み見積もりにリンクできます。',
          },
          {
            title: '顧客別見積もり',
            description: '特定の顧客に関連するすべての見積もりを確認します。顧客の活動と価格履歴の追跡に役立ちます。',
          },
        ],
      },
      userManagement: {
        title: 'ユーザー管理',
        items: [
          {
            title: 'ユーザーリスト',
            description: '登録されたすべてのユーザーの氏名、メール、会社、国籍、ネットワーク会員資格、役割（管理者/メンバー）を確認します。',
          },
          {
            title: 'ユーザー編集',
            description: '「編集」をクリックして役割、会社、国籍、ネットワーク会員資格を含むユーザー詳細を修正します。変更は即座に保存され記録されます。',
          },
          {
            title: '検索とフィルター',
            description: '検索バーを使用して氏名、メール、会社名でユーザーを検索します。',
          },
        ],
      },
      rateTableViewer: {
        title: 'レートテーブルビューアー',
        items: [
          {
            title: 'レートテーブル表示',
            description: 'キャリア別レートテーブル（UPS、DHL、EMAX）を読み取り専用で閲覧します。すべての配送ゾーンの重量別価格が表示されます。',
          },
          {
            title: 'ゾーン参照',
            description: '各キャリアには固有のゾーンマッピングがあります。ビューアーで見積もり作成時の参考として各ゾーンに属する国を確認できます。',
          },
        ],
      },
      auditLog: {
        title: '監査ログ',
        items: [
          {
            title: '監査ログ表示',
            description: 'すべての管理者操作（マージンルール変更、FSC更新、サーチャージ修正、ユーザー編集）がタイムスタンプ、ユーザー、操作タイプ、詳細とともに記録されます。',
          },
          {
            title: '検索とフィルター',
            description: '期間、操作タイプ、ユーザーで監査ログをフィルタリングします。検索バーで特定のエントリを検索します。',
          },
          {
            title: 'コンプライアンス',
            description: '監査ログはコンプライアンスと説明責任のため、すべての設定変更の完全な記録を提供します。',
          },
        ],
      },
    },
  },
};
