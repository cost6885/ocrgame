// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// 👉 기존 프론트에서 쓰던 GAS_ENDPOINT 그대로 넣기
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzEOo-1nhDh26qozU_Fmwe1zFdMHuv4HOZG5lnPUwT6ncRSvxMZUhmXgTpHacdpZpMobQ/exec";

app.use(express.json());

// 개발환경(로컬 3000 ↔ 4000) 고려해서 느슨한 CORS 설정
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ------------------------------------------------------------------
// 1) 참여 횟수 조회 API (기존: fetchPlayCountFromServer → GAS 직접 호출)
//    GET /api/playCount?company=...&employeeId=...
// ------------------------------------------------------------------
app.get("/api/playCount", async (req, res) => {
  const { company, employeeId } = req.query;

  if (!company || !employeeId) {
    return res
      .status(400)
      .json({ status: "error", message: "company, employeeId가 필요합니다." });
  }

  try {
    const params = new URLSearchParams({
      type: "playCount",
      company,
      employeeId,
    });

    const gsRes = await axios.get(`${GAS_URL}?${params.toString()}`);

    // GAS에서 넘겨준 JSON 그대로 전달 (status, playCount 등)
    return res.json(gsRes.data);
  } catch (err) {
    console.error("[playCount] GAS 호출 실패:", err.message);
    return res.status(500).json({
      status: "error",
      message: "참여 횟수 조회 중 오류가 발생했습니다.",
    });
  }
});

// ------------------------------------------------------------------
// 2) 랭킹 조회 API (기존: GET GAS_ENDPOINT?type=ranking)
//    GET /api/ranking
// ------------------------------------------------------------------
app.get("/api/ranking", async (req, res) => {
  try {
    const url = `${GAS_URL}?type=ranking`;
    const gsRes = await axios.get(url);

    // GAS에서 주는 형식 그대로 통과
    return res.json(gsRes.data);
  } catch (err) {
    console.error("[ranking] GAS 호출 실패:", err.message);
    return res.status(500).json({
      status: "error",
      message: "랭킹 데이터를 불러오는 중 오류가 발생했습니다.",
    });
  }
});

// ------------------------------------------------------------------
// 3) 기록 제출 API (기존: autoSubmitRanking → GAS로 직접 POST)
//    POST /api/submit
//    body: { company, employeeId, name, timeTaken, accuracy, quizResults }
// ------------------------------------------------------------------
app.post("/api/submit", async (req, res) => {
  const {
    company,
    employeeId,
    name,
    timeTaken,
    accuracy,
    quizResults, // { totalMs, avgAccuracy, rounds } 형태였지
  } = req.body || {};

  if (!company || !employeeId || !name) {
    return res.status(400).json({
      status: "error",
      message: "company, employeeId, name은 필수입니다.",
    });
  }

  if (
    typeof timeTaken !== "number" ||
    typeof accuracy !== "number" ||
    typeof quizResults !== "object"
  ) {
    return res.status(400).json({
      status: "error",
      message: "timeTaken, accuracy, quizResults 형식이 올바르지 않습니다.",
    });
  }

  try {
    // 기존 프론트에서 GAS로 보내던 payload 그대로 구성
    const payload = {
      company,
      employeeId,
      name,
      timeTaken,
      accuracy,
      quizResults,
    };

    // GAS 쪽에서 text/plain + no-cors 기준으로 만들었을 가능성이 크니까
    // 여기서도 동일 포맷으로 맞춰주는 게 안전함
    const gsRes = await axios.post(GAS_URL, payload, {
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    // GAS에서 성공/실패 JSON을 내려주는 구조라면 그대로 패스
    return res.json(gsRes.data);
  } catch (err) {
    console.error("[submit] GAS 호출 실패:", err.message);
    return res.status(500).json({
      status: "error",
      message: "기록 저장 중 오류가 발생했습니다.",
    });
  }
});

// ------------------------------------------------------------------
// 서버 시작
// ------------------------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Human OCR API server running on http://localhost:${PORT}`);
});
