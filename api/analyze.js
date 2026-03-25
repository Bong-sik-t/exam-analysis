const Anthropic = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { studentData } = req.body;
  if (!studentData) return res.status(400).json({ error: 'No student data provided' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 Environment Variables를 추가하세요.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `당신은 한국 고등학교 학생들의 모의고사 성적을 분석하는 교육 전문가입니다.
각 과목의 틀린 문항 번호를 바탕으로 취약한 영역을 파악하고, 구체적이고 실용적인 학습 방향을 제시해주세요.
분석은 마크다운 형식으로 작성하고, 각 과목별로 구분하여 설명해주세요.`;

  const userPrompt = `다음 학생의 모의고사 성적을 분석해주세요:

학생 정보:
- 이름: ${studentData.name}
- 학년/반/번호: ${studentData.grade}학년 ${studentData.class}반 ${studentData.number}번
- 시험: ${studentData.examInfo}

과목별 성적 및 틀린 문항:
${Object.entries(studentData.subjects || {}).map(([subj, data]) =>
  `## ${subj}
- 원점수: ${data.score}/${data.maxScore}
- 틀린 문항(${data.wrongCount}개): ${data.wrongQuestions.join(', ') || '없음'}
- 정답률: ${data.correctRate}%`
).join('\n\n')}

다음을 분석해주세요:
1. 과목별 취약점 패턴 분석
2. 우선적으로 보완해야 할 영역
3. 구체적인 학습 전략 제안
4. 강점 과목 활용 방안`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    res.json({ analysis: message.content[0].text });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: 'AI 분석 중 오류가 발생했습니다: ' + err.message });
  }
};
