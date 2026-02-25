export type Language = 'en' | 'ko';

export const translations = {
  en: {
    // Navigation / General
    'nav.smartQuote': 'Smart Quote',
    'nav.login': 'Log In',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Log Out',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin Panel',
    
    // Landing Page
    'landing.title.main': 'Global logistics quoting',
    'landing.title.sub': 'made lightning fast.',
    'landing.subtitle': 'Instantly calculate reliable shipping quotes including UPS, DHL, E-MAX integrations, taxes, and specialized fees.',
    'landing.getStarted': 'Get Started',
    'landing.instantQuotes': 'Instant Quotes',
    'landing.instantQuotes.desc': 'Calculate Door-to-Door and Door-to-Airport rates instantly with real-time variables.',
    'landing.accurateBreakdown': 'Accurate Breakdown',
    'landing.accurateBreakdown.desc': 'Detailed view of FSC, customs duties, packing logistics, and origin/destination fees.',
    'landing.verifiedCarriers': 'Verified Carriers',
    'landing.verifiedCarriers.desc': 'Quotes based on authentic structures from premium logistics partners.',
    
    // Auth Pages
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.signin': 'Sign in',
    'auth.signup': 'Sign Up',
    'auth.signinTitle': 'Sign in to your account',
    'auth.signupTitle': 'Create an account',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.invalidCredentials': 'Invalid email or password.',
    'auth.passwordsNotMatch': 'Passwords do not match.',
    'auth.emailExists': 'Email already exists or invalid data.',
    'auth.fillAll': 'Please fill out all fields.',
    'auth.backHome': '← Back to Home',

    // Calculator - Headers
    'calc.shipmentConfig': 'Shipment Configuration',
    'calc.shipmentConfigDesc': 'Enter cargo details to generate overseas (UPS, DHL, E-MAX) integrated quote.',
    'calc.totalEstimate': 'Total Estimate',
    'calc.viewDetails': 'View Details',
    'calc.resetQuote': 'Reset Quote',

    // Calculator - Sections
    'calc.section.route': 'Route & Terms',
    'calc.section.cargo': 'Cargo Details',
    'calc.section.service': 'Value Added Services',
    'calc.section.financial': 'Financial Factors',
    'calc.label.origin': 'Origin Country',
    'calc.label.destination': 'Destination Country',
    'calc.label.zip': 'Dest. Zip Code',
    'calc.label.carrier': 'Overseas Carrier',
    'calc.label.mode': 'Shipping Mode',

    // Cost Breakdown
    'quote.summary': 'Quote Summary',
    'quote.downloadPdf': 'Download PDF',
    'quote.origin': 'Origin',
    'quote.destination': 'Destination',
    'quote.logisticsCost': 'Logistics Cost',
    'quote.originCost': 'Origin Cost',
    'quote.overseasFreight': 'Overseas Freight',
    'quote.destinationCost': 'Destination Cost',
    'quote.pricingStrategy': 'Pricing Strategy',
    'quote.margin': 'Margin',
    'quote.finalPrice': 'Final Quote Price',
    'quote.approx': 'approx.',
  },
  ko: {
     // Navigation / General
     'nav.smartQuote': '스마트 견적',
     'nav.login': '로그인',
     'nav.signup': '회원가입',
     'nav.logout': '로그아웃',
     'nav.dashboard': '대시보드',
     'nav.admin': '관리자 패널',
     
     // Landing Page
     'landing.title.main': '글로벌 물류 견적,',
     'landing.title.sub': '가장 빠르고 정확하게.',
     'landing.subtitle': 'UPS, DHL, E-MAX 연동, 세금 및 특수 비용까지 포함된 신뢰할 수 있는 배송 견적을 즉시 계산하세요.',
     'landing.getStarted': '시작하기',
     'landing.instantQuotes': '즉각적인 견적 산출',
     'landing.instantQuotes.desc': '실시간 변수를 적용하여 Door-to-Door 및 Door-to-Airport 요금을 즉시 계산합니다.',
     'landing.accurateBreakdown': '정확한 비용 세분화',
     'landing.accurateBreakdown.desc': '유류할증료(FSC), 관세, 포장 물류비, 출발지/도착지 수수료의 상세 내역을 제공합니다.',
     'landing.verifiedCarriers': '검증된 운송사 파트너',
     'landing.verifiedCarriers.desc': '프리미엄 물류 파트너의 실제 운임 구조를 바탕으로 한 견적입니다.',
     
     // Auth Pages
     'auth.email': '이메일 주소',
     'auth.password': '비밀번호',
     'auth.confirmPassword': '비밀번호 확인',
     'auth.signin': '로그인',
     'auth.signup': '가입하기',
     'auth.signinTitle': '계정에 로그인하세요',
     'auth.signupTitle': '새 계정 만들기',
     'auth.noAccount': "계정이 없으신가요?",
     'auth.haveAccount': '이미 계정이 있으신가요?',
     'auth.invalidCredentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
     'auth.passwordsNotMatch': '비밀번호가 일치하지 않습니다.',
     'auth.emailExists': '이미 존재하는 이메일이거나 데이터가 유효하지 않습니다.',
     'auth.fillAll': '모든 필드를 입력해주세요.',
     'auth.backHome': '← 홈으로 돌아가기',
 
     // Calculator - Headers
     'calc.shipmentConfig': '화물 배송 설정',
     'calc.shipmentConfigDesc': '화물 세부 정보를 입력하여 해외 통합 견적(UPS, DHL, E-MAX)을 생성합니다.',
     'calc.totalEstimate': '총 예상 견적',
     'calc.viewDetails': '상세 정보 보기',
     'calc.resetQuote': '견적 초기화',
 
     // Calculator - Sections
     'calc.section.route': '경로 및 배송조건',
     'calc.section.cargo': '화물 상세설정',
     'calc.section.service': '부가 서비스 옵션',
     'calc.section.financial': '재무 및 환율 적용',
     'calc.label.origin': '출발 국가',
     'calc.label.destination': '도착 국가',
     'calc.label.zip': '도착지 우편번호',
     'calc.label.carrier': '해외 운송사',
     'calc.label.mode': '배송 모드',

     // Cost Breakdown
     'quote.summary': '견적 요약서',
     'quote.downloadPdf': 'PDF 다운로드',
     'quote.origin': '출발지 (Origin)',
     'quote.destination': '도착지 (Destination)',
     'quote.logisticsCost': '물류 비용 세부내역',
     'quote.originCost': '출발지 발생 비용',
     'quote.overseasFreight': '해외 운송료',
     'quote.destinationCost': '도착지 발생 비용',
     'quote.pricingStrategy': '가격 전략 (마진)',
     'quote.margin': '마진 (Margin)',
     'quote.finalPrice': '최종 견적가',
     'quote.approx': '약',
  }
};
