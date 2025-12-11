// src/api/submitRecord.js
const API_URL = "/api/submit";

/**
 * Human OCR 기록 제출
 * @param {Object} data
 *   {
 *     company: string,
 *     employeeId: string,
 *     name: string,
 *     timeTaken: number,   // 초 단위 (예: 23.45)
 *     accuracy: number,    // 평균 정확도 (예: 92.4)
 *     quizResults: {       // 세션 요약 (서버/GAS에서 쓰기 편하게)
 *       totalMs: number,
 *       avgAccuracy: number,
 *       rounds: number
 *     }
 *   }
 */
export default async function submitRecord(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // 서버가 JSON → GAS로 다시 포워딩
      },
      body: JSON.stringify(data),
    });

    // 서버에서 4xx/5xx 응답도 JSON으로 내려주도록 했으니,
    // 여기서도 그냥 JSON 파싱 후 status 보고 판단
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("[submitRecord] 네트워크 오류:", err);
    return {
      status: "error",
      message: "기록 제출에 실패했어요 😢",
    };
  }
}
