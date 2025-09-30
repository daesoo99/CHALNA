#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');

// 번역 맵핑 (한국어 -> 다른 언어들)
const translations = {
  // 기본 UI 텍스트
  "💀 사망 시계": {
    en: "💀 Death Clock",
    ja: "💀 デスクロック",
    zh: "💀 死亡时钟"
  },
  "생년월일 (YYYY-MM-DD)": {
    en: "Birth Date (YYYY-MM-DD)",
    ja: "生年月日 (YYYY-MM-DD)",
    zh: "出生日期 (YYYY-MM-DD)"
  },
  "예상 수명 (년)": {
    en: "Life Expectancy (years)",
    ja: "予想寿命 (年)",
    zh: "预期寿命 (年)"
  },
  "시작": {
    en: "Start",
    ja: "開始",
    zh: "开始"
  },
  "중지": {
    en: "Stop",
    ja: "停止",
    zh: "停止"
  },
  "남은 시간": {
    en: "Time Left",
    ja: "残り時間",
    zh: "剩余时间"
  },
  "년": {
    en: "years",
    ja: "年",
    zh: "年"
  },
  "월": {
    en: "months",
    ja: "月",
    zh: "月"
  },
  "일": {
    en: "days",
    ja: "日",
    zh: "日"
  },
  "시": {
    en: "hours",
    ja: "時間",
    zh: "小时"
  },
  "분": {
    en: "minutes",
    ja: "分",
    zh: "分钟"
  },
  "초": {
    en: "seconds",
    ja: "秒",
    zh: "秒"
  },
  "오류": {
    en: "Error",
    ja: "エラー",
    zh: "错误"
  },
  "생년월일을 입력해주세요 (YYYY-MM-DD)": {
    en: "Please enter your birth date (YYYY-MM-DD)",
    ja: "生年月日を入力してください (YYYY-MM-DD)",
    zh: "请输入您的出生日期 (YYYY-MM-DD)"
  },
  "올바른 날짜 형식으로 입력해주세요 (YYYY-MM-DD)": {
    en: "Please enter a valid date format (YYYY-MM-DD)",
    ja: "正しい日付形式で入力してください (YYYY-MM-DD)",
    zh: "请输入正确的日期格式 (YYYY-MM-DD)"
  },
  "시간 초과": {
    en: "Time Over",
    ja: "時間超過",
    zh: "时间超过"
  },
  "예상 수명을 넘어섰습니다!": {
    en: "You have exceeded your life expectancy!",
    ja: "予想寿命を超えました！",
    zh: "您已超过预期寿命！"
  },
  "언어 선택": {
    en: "Select Language",
    ja: "言語選択",
    zh: "选择语言"
  },
  "🔔 알림 끄기": {
    en: "🔔 Turn Off Notifications",
    ja: "🔔 通知をオフ",
    zh: "🔔 关闭通知"
  },
  "🔕 알림 켜기": {
    en: "🔕 Turn On Notifications",
    ja: "🔕 通知をオン",
    zh: "🔕 开启通知"
  },
  "미래 날짜는 입력할 수 없습니다.": {
    en: "Future dates cannot be entered.",
    ja: "未来の日付は入力できません。",
    zh: "不能输入未来日期。"
  },
  "150세 이상은 입력할 수 없습니다.": {
    en: "Ages over 150 cannot be entered.",
    ja: "150歳以上は入力できません。",
    zh: "不能输入150岁以上的年龄。"
  },
  "예상 수명이 현재 나이보다 작습니다.": {
    en: "Life expectancy is less than current age.",
    ja: "予想寿命が現在の年齢より小さいです。",
    zh: "预期寿命小于当前年龄。"
  },
  "예상 수명은 1-150년 범위로 입력해주세요.": {
    en: "Please enter life expectancy in the range of 1-150 years.",
    ja: "予想寿命は1-150年の範囲で入力してください。",
    zh: "请输入1-150年范围内的预期寿命。"
  },
  "로딩 중...": {
    en: "Loading...",
    ja: "読み込み中...",
    zh: "加载中..."
  },
  "유효하지 않은 날짜입니다.": {
    en: "Invalid date.",
    ja: "無効な日付です。",
    zh: "无效日期。"
  },
  "인생 진행률": {
    en: "Life Progress",
    ja: "人生進行率",
    zh: "人生进度"
  },
  "라이트 모드로 전환": {
    en: "Switch to Light Mode",
    ja: "ライトモードに切り替え",
    zh: "切换到浅色模式"
  },
  "다크 모드로 전환": {
    en: "Switch to Dark Mode",
    ja: "ダークモードに切り替え",
    zh: "切换到深色模式"
  },
  "테마를 변경합니다": {
    en: "Change theme",
    ja: "テーマを変更",
    zh: "更改主题"
  },
  "언어를 선택합니다": {
    en: "Select language",
    ja: "言語を選択",
    zh: "选择语言"
  },
  "생년월일을 선택합니다": {
    en: "Select birth date",
    ja: "生年月日を選択",
    zh: "选择出生日期"
  },
  "1-150 사이의 숫자를 입력하세요": {
    en: "Enter a number between 1-150",
    ja: "1-150の数字を入力してください",
    zh: "请输入1-150之间的数字"
  },
  "확인": {
    en: "OK",
    ja: "確認",
    zh: "确认"
  },
  "테스트 모드 켜짐": {
    en: "Test Mode On",
    ja: "テストモードオン",
    zh: "测试模式开启"
  },
  "테스트 모드 끄짐": {
    en: "Test Mode Off",
    ja: "テストモードオフ",
    zh: "测试模式关闭"
  },
  "테스트 모드: 5분 내에 모든 마일스톤을 확인할 수 있습니다.": {
    en: "Test Mode: You can check all milestones within 5 minutes.",
    ja: "テストモード: 5分以内にすべてのマイルストーンを確認できます。",
    zh: "测试模式：您可以在5分钟内查看所有里程碑。"
  },
  "실제 마일스톤 모드로 복귀했습니다.": {
    en: "Returned to actual milestone mode.",
    ja: "実際のマイルストーンモードに復帰しました。",
    zh: "已返回实际里程碑模式。"
  },
  // 새로운 간단한 마일스톤 메시지들
  "하루가 지났습니다": {
    en: "One Day Has Passed",
    ja: "1日が経過しました",
    zh: "一天已过"
  },
  "죽음을 마주한 지 하루가 지났습니다. 시간의 소중함을 느끼고 계신가요?": {
    en: "One day has passed since facing death. Do you feel the preciousness of time?",
    ja: "死を意識して1日が経ちました。時間の貴重さを感じていますか？",
    zh: "面对死亡已经一天了。您是否感受到时间的珍贵？"
  },
  "일주일의 성찰": {
    en: "A Week of Reflection",
    ja: "1週間の内省",
    zh: "一周的反思"
  },
  "일주일째 자신의 유한함을 깨달았습니다. 이 시간이 당신을 어떻게 변화시켰나요?": {
    en: "You've realized your mortality for a week. How has this time changed you?",
    ja: "1週間、自分の有限性を悟りました。この時間があなたをどのように変えましたか？",
    zh: "您已经意识到自己的有限性一周了。这段时间是如何改变您的？"
  },
  "2주간의 여정": {
    en: "Two Weeks Journey",
    ja: "2週間の旅",
    zh: "两周的旅程"
  },
  "2주째 죽음을 의식하며 살고 있습니다. 매일을 더 의미있게 보내고 계신가요?": {
    en: "You've been living with awareness of death for 2 weeks. Are you spending each day more meaningfully?",
    ja: "2週間、死を意識して生きています。毎日をより意味深く過ごしていますか？",
    zh: "您已经意识到死亡生活了2周。您是否过着更有意义的每一天？"
  },
  "한 달의 깨달음": {
    en: "A Month of Realization",
    ja: "1ヶ月の気づき",
    zh: "一个月的觉悟"
  },
  "한 달째 삶의 유한함과 함께하고 있습니다. 삶에 대한 관점이 바뀌었나요?": {
    en: "You've been living with life's finitude for a month. Has your perspective on life changed?",
    ja: "1ヶ月間、人生の有限性と共にいます。人生に対する視点は変わりましたか？",
    zh: "您已经与生命的有限性共同生活了一个月。您对生活的看法改变了吗？"
  },
  "두 달의 성장": {
    en: "Two Months of Growth",
    ja: "2ヶ月の成長",
    zh: "两个月的成长"
  },
  "두 달째, 죽음이 삶의 스승이 되어주고 있습니다. 더 깊은 삶을 살고 계신가요?": {
    en: "For two months, death has been your life teacher. Are you living a deeper life?",
    ja: "2ヶ月目、死が人生の師となってくれています。より深い人生を送っていますか？",
    zh: "两个月来，死亡一直是您生活的老师。您是否过着更深刻的生活？"
  },
  "하루의 마무리": {
    en: "End of the Day",
    ja: "1日の終わり",
    zh: "一天的结束"
  },
  "오늘 하루도 지나갔습니다. 시간은 되돌릴 수 없습니다. 내일은 어떤 하루를 만들어 가시겠습니까?": {
    en: "Another day has passed. Time cannot be turned back. What kind of day will you create tomorrow?",
    ja: "今日も1日が過ぎました。時間は元に戻せません。明日はどんな1日を作っていきますか？",
    zh: "今天又过去了。时间无法倒流。明天您将创造怎样的一天？"
  },
  // 추가된 확장 마일스톤들
  "3일의 각성": {
    en: "Three Days of Awakening",
    ja: "3日間の目覚め",
    zh: "三天的觉醒"
  },
  "죽음을 의식한 지 3일이 지났습니다. 일상 속에서 변화를 느끼시나요?": {
    en: "Three days have passed since becoming aware of death. Do you feel any changes in your daily life?",
    ja: "死を意識してから3日が経ちました。日常の中で変化を感じていますか？",
    zh: "意识到死亡已经三天了。您在日常生活中感受到变化了吗？"
  },
  "3주간의 깨달음": {
    en: "Three Weeks of Realization",
    ja: "3週間の気づき",
    zh: "三周的觉悟"
  },
  "3주 동안 유한한 삶을 살아왔습니다. 삶의 우선순위가 달라졌나요?": {
    en: "You've lived a finite life for three weeks. Have your life priorities changed?",
    ja: "3週間、有限な人生を生きてきました。人生の優先順位は変わりましたか？",
    zh: "您已经过了三周的有限生活。您的人生优先级改变了吗？"
  },
  "계절 하나의 성찰": {
    en: "A Season of Reflection",
    ja: "一季節の内省",
    zh: "一个季节的反思"
  },
  "3개월, 한 계절이 지났습니다. 죽음이 당신의 삶에 어떤 변화를 가져다주었나요?": {
    en: "Three months, one season has passed. What changes has death brought to your life?",
    ja: "3ヶ月、一つの季節が過ぎました。死があなたの人生にどんな変化をもたらしましたか？",
    zh: "三个月，一个季节过去了。死亡为您的生活带来了什么变化？"
  },
  "백일의 여정": {
    en: "One Hundred Days Journey",
    ja: "百日の旅",
    zh: "百日之旅"
  },
  "100일, 의미 있는 숫자입니다. 이 시간 동안 어떤 소중한 것들을 발견하셨나요?": {
    en: "100 days, a meaningful number. What precious things have you discovered during this time?",
    ja: "100日、意味のある数字です。この期間中、どんな貴重なものを発見しましたか？",
    zh: "100天，一个有意义的数字。在这段时间里，您发现了什么珍贵的东西？"
  },
  "반년의 여정": {
    en: "Half a Year Journey",
    ja: "半年の旅",
    zh: "半年的旅程"
  },
  "6개월이 흘렀습니다. 죽음과 함께한 이 시간이 당신을 어떻게 성장시켰나요?": {
    en: "Six months have passed. How has this time with death helped you grow?",
    ja: "6ヶ月が経ちました。死と共にしたこの時間があなたをどのように成長させましたか？",
    zh: "六个月过去了。与死亡共度的这段时间如何帮助您成长？"
  },
  "9개월의 성숙": {
    en: "Nine Months of Maturity",
    ja: "9ヶ月の成熟",
    zh: "九个月的成熟"
  },
  "9개월, 새 생명이 태어나는 시간입니다. 당신도 새로운 자신으로 태어났나요?": {
    en: "Nine months, the time for new life to be born. Have you been reborn as a new self?",
    ja: "9ヶ月、新しい生命が生まれる時間です。あなたも新しい自分として生まれ変わりましたか？",
    zh: "九个月，新生命诞生的时间。您是否也重生为新的自己？"
  },
  "1년의 완성": {
    en: "One Year's Completion",
    ja: "1年の完成",
    zh: "一年的完成"
  },
  "1년 전과 지금, 당신은 얼마나 달라졌습니까? 죽음이 가르쳐준 삶의 지혜는 무엇인가요?": {
    en: "How different are you now compared to a year ago? What wisdom about life has death taught you?",
    ja: "1年前と今、あなたはどれほど変わりましたか？死が教えてくれた人生の知恵は何ですか？",
    zh: "与一年前相比，您现在有多大变化？死亡教给您什么人生智慧？"
  },
  "500일의 깊이": {
    en: "Five Hundred Days' Depth",
    ja: "500日の深さ",
    zh: "五百天的深度"
  },
  "500일 동안 죽음과 동행했습니다. 이제 삶과 죽음이 하나임을 느끼시나요?": {
    en: "You've walked with death for 500 days. Do you now feel that life and death are one?",
    ja: "500日間、死と歩んできました。今、生と死が一つであることを感じていますか？",
    zh: "您与死亡同行了500天。现在您是否感觉到生死合一？"
  },
  "2년의 지혜": {
    en: "Two Years of Wisdom",
    ja: "2年の知恵",
    zh: "两年的智慧"
  },
  "2년이라는 시간, 당신의 죽음 의식이 얼마나 깊어졌습니까? 삶을 더 사랑하게 되었나요?": {
    en: "Two years of time, how deep has your awareness of death become? Have you come to love life more?",
    ja: "2年という時間、あなたの死の意識はどれほど深くなりましたか？人生をより愛するようになりましたか？",
    zh: "两年时间，您的死亡意识变得多深？您是否更加热爱生活？"
  },
  "천일의 깨달음": {
    en: "A Thousand Days of Enlightenment",
    ja: "千日の悟り",
    zh: "千日的觉悟"
  },
  "천 번의 해가 떴다 졌습니다. 죽음이 삶의 스승이었음을 인정하시나요?": {
    en: "A thousand suns have risen and set. Do you acknowledge that death has been life's teacher?",
    ja: "千回の太陽が昇り沈みました。死が人生の師であったことを認めますか？",
    zh: "千次日出日落。您是否承认死亡一直是生活的老师？"
  },
  "3년의 완성": {
    en: "Three Years' Completion",
    ja: "3年の完成",
    zh: "三年的完成"
  },
  "3년, 충분히 긴 시간입니다. 이제 죽음 없는 삶이 얼마나 공허한지 아시겠나요?": {
    en: "Three years, a sufficiently long time. Do you now understand how empty life would be without death?",
    ja: "3年、十分に長い時間です。今、死のない人生がどれほど空虚かお分かりになりますか？",
    zh: "三年，足够长的时间。您现在明白没有死亡的生活有多空虚吗？"
  },
  // 새로운 마일스톤들
  "5개월의 중간점": {
    en: "Five Months Midpoint",
    ja: "5ヶ月の中間点",
    zh: "五个月的中点"
  },
  "150일, 5개월이라는 중간 지점에 도달했습니다. 이 시간 동안 축적된 깨달음들이 당신을 어떻게 변화시켰나요?": {
    en: "You've reached the midpoint of 150 days, 5 months. How have the insights accumulated during this time transformed you?",
    ja: "150日、5ヶ月という中間点に到達しました。この期間に蓄積された気づきがあなたをどのように変化させましたか？",
    zh: "您已到达150天、5个月的中点。在这段时间里积累的洞察如何改变了您？"
  },
  "200일의 이정표": {
    en: "200 Days Milestone",
    ja: "200日のマイルストーン",
    zh: "200天的里程碑"
  },
  "200일, 심리적으로 의미 깊은 숫자에 도달했습니다. 이 성취가 당신에게 어떤 감정을 불러일으키나요?": {
    en: "200 days, you've reached a psychologically meaningful number. What emotions does this achievement evoke in you?",
    ja: "200日、心理的に意味深い数字に到達しました。この達成があなたにどんな感情を呼び起こしますか？",
    zh: "200天，您已经达到了一个心理上有意义的数字。这一成就在您心中唤起了什么情感？"
  },
  "300일의 깊이": {
    en: "300 Days' Depth",
    ja: "300日の深さ",
    zh: "300天的深度"
  },
  "300일, 거의 1년에 가까운 긴 여정을 걸어왔습니다. 죽음과의 동행이 일상이 되어버린 지금, 무엇이 달라졌나요?": {
    en: "300 days, you've walked a long journey close to a year. Now that walking with death has become routine, what has changed?",
    ja: "300日、ほぼ1年に近い長い旅を歩んできました。死との同行が日常となった今、何が変わりましたか？",
    zh: "300天，您已经走过了接近一年的漫长旅程。现在与死亡同行已成为日常，什么改变了？"
  },
  "400일의 숙성": {
    en: "400 Days of Maturation",
    ja: "400日の熟成",
    zh: "400天的成熟"
  },
  "400일, 시간이 당신 안에서 숙성되어 왔습니다. 죽음에 대한 두려움이 지혜로 변화하는 것을 느끼시나요?": {
    en: "400 days, time has been maturing within you. Do you feel your fear of death transforming into wisdom?",
    ja: "400日、時間があなたの中で熟成されてきました。死への恐怖が知恵に変化するのを感じていますか？",
    zh: "400天，时间在您内心成熟。您是否感觉到对死亡的恐惧正在转化为智慧？"
  },
  "600일의 안정": {
    en: "600 Days of Stability",
    ja: "600日の安定",
    zh: "600天的稳定"
  },
  "600일, 이제 죽음과의 관계가 안정되었습니다. 삶과 죽음 사이의 균형을 찾은 지금, 어떤 평화를 느끼시나요?": {
    en: "600 days, your relationship with death has now stabilized. Having found balance between life and death, what peace do you feel?",
    ja: "600日、今や死との関係が安定しました。生と死の間のバランスを見つけた今、どんな平和を感じていますか？",
    zh: "600天，您与死亡的关系现在已经稳定。在找到生死平衡的现在，您感受到什么样的平静？"
  },
  "4년의 원숙": {
    en: "Four Years of Maturity",
    ja: "4年の円熟",
    zh: "四年的成熟"
  },
  "1460일, 4년이라는 세월이 흘렀습니다. 이제 죽음은 더 이상 적이 아닌 오래된 친구가 되었나요?": {
    en: "1460 days, four years have passed. Has death now become not an enemy but an old friend?",
    ja: "1460日、4年という歳月が流れました。今や死はもはや敵ではなく古い友人となりましたか？",
    zh: "1460天，四年时光已逝。死亡现在是否不再是敌人，而是成为了老朋友？"
  },
  "1500일의 깊은 통찰": {
    en: "1500 Days of Deep Insight",
    ja: "1500日の深い洞察",
    zh: "1500天的深刻洞察"
  },
  "1500일, 천오백 번의 해가 떴다 졌습니다. 이 긴 여정에서 발견한 삶의 진리는 무엇인가요?": {
    en: "1500 days, fifteen hundred suns have risen and set. What truths about life have you discovered in this long journey?",
    ja: "1500日、千五百回の太陽が昇り沈みました。この長い旅路で発見した人生の真理は何ですか？",
    zh: "1500天，一千五百次日出日落。在这漫长的旅程中，您发现了什么人生真理？"
  },
  "5년의 완전한 변화": {
    en: "Five Years of Complete Transformation",
    ja: "5年の完全な変化",
    zh: "五年的完全转变"
  },
  "1825일, 5년이라는 완전한 변화의 시간을 보냈습니다. 죽음이 가르쳐준 삶의 예술을 이제 완전히 체득하셨나요?": {
    en: "1825 days, you've spent five years of complete transformation. Have you now fully mastered the art of living that death has taught you?",
    ja: "1825日、5年という完全な変化の時間を過ごしました。死が教えてくれた人生の芸術を今や完全に体得されましたか？",
    zh: "1825天，您度过了五年完全转变的时光。您现在是否完全掌握了死亡教给您的生活艺术？"
  }
};

let syncInProgress = false;

function syncTranslations() {
  if (syncInProgress) {
    console.log('⏳ 동기화가 이미 진행 중입니다...');
    return;
  }

  syncInProgress = true;
  const localesDir = path.join(__dirname, 'locales');
  const koFile = path.join(localesDir, 'ko.json');

  if (!fs.existsSync(koFile)) {
    console.error('❌ 한국어 파일을 찾을 수 없습니다:', koFile);
    syncInProgress = false;
    return;
  }

  try {
    // 한국어 파일 읽기
    const koData = JSON.parse(fs.readFileSync(koFile, 'utf8'));
    console.log('🇰🇷 한국어 파일을 읽었습니다.');

    // 각 언어별로 번역 파일 업데이트
    ['en', 'ja', 'zh'].forEach(lang => {
      const langFile = path.join(localesDir, `${lang}.json`);
      let langData = {};

      // 기존 파일이 있으면 읽기
      if (fs.existsSync(langFile)) {
        langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
      }

      // 한국어 파일의 각 키에 대해 번역 적용
      Object.keys(koData).forEach(key => {
        const koValue = koData[key];

        // 번역이 존재하는 경우
        if (translations[koValue] && translations[koValue][lang]) {
          langData[key] = translations[koValue][lang];
        } else {
          // 번역이 없는 경우 기존 값 유지하거나 한국어 값 사용
          if (!langData[key]) {
            langData[key] = koValue; // 임시로 한국어 값 사용
            console.warn(`⚠️  ${lang}: "${koValue}" 번역이 없습니다.`);
          }
        }
      });

      // 파일 저장
      fs.writeFileSync(langFile, JSON.stringify(langData, null, 2), 'utf8');
      console.log(`✅ ${lang.toUpperCase()} 파일이 업데이트되었습니다.`);
    });

    console.log('🎉 모든 언어 파일이 자동 동기화되었습니다!\n');

  } catch (error) {
    console.error('❌ 동기화 중 오류 발생:', error.message);
  } finally {
    syncInProgress = false;
  }
}

function startAutoSync() {
  const koFile = path.join(__dirname, 'locales', 'ko.json');

  console.log('🚀 Death Clock 다국어 자동 동기화 시작!');
  console.log('👀 한국어 파일 변경 감지 중: ' + koFile);
  console.log('📝 파일이 변경되면 자동으로 다른 언어들을 업데이트합니다.\n');

  // 초기 동기화
  syncTranslations();

  // 파일 변경 감지
  const watcher = chokidar.watch(koFile, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher.on('change', () => {
    console.log('\n📝 한국어 파일이 변경되었습니다!');
    console.log('🔄 자동 동기화를 시작합니다...');

    // 약간의 지연 후 동기화 (파일 쓰기 완료를 위해)
    setTimeout(() => {
      syncTranslations();
    }, 500);
  });

  watcher.on('error', (error) => {
    console.error('❌ 파일 감시 오류:', error);
  });

  // 프로세스 종료 시 정리
  process.on('SIGINT', () => {
    console.log('\n👋 자동 동기화를 종료합니다...');
    watcher.close();
    process.exit(0);
  });
}

// 자동 동기화 시작
startAutoSync();