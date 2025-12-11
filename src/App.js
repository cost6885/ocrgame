import React, { useState, useEffect, useRef } from "react";
import "./styles.css";
import OcrExplainer from "./OcrExplainer";
import EventPrizeBoard from "./EventPrizeBoard";
import submitRecord from "./api/submitRecord";

// ====== 텍스트 번들 설정 ======
const TEXT_BUNDLES = [
  { id: "memil", file: "memil.json", label: "메밀꽃 필 무렵" },
  { id: "camellia", file: "camellia.json", label: "동백꽃" },
  { id: "cheongsando", file: "cheongsando.json", label: "청산도" },
  { id: "dulsaram_eol", file: "dulsaram_eol.json", label: "둘사람의 얼" },
  {
    id: "hangeul_day_love",
    file: "hangeul_day_love.json",
    label: "한글날 사랑",
  },
  { id: "last", file: "last.json", label: "라스트" },
  { id: "rain_shower", file: "rain_shower.json", label: "소나기" },
  {
    id: "richman_and_donkey_split",
    file: "richman_and_donkey_split.json",
    label: "부자와 나귀",
  },
  { id: "starnight", file: "starnight.json", label: "별밤" },
  {
    id: "the_little_prince",
    file: "the_little_prince.json",
    label: "어린왕자",
  },
  { id: "the_star_short", file: "the_star_short.json", label: "별 이야기" },
];

// 회사+사번 기준 참여 횟수 조회 (백엔드 프록시 경유)
const fetchPlayCountFromServer = async (company, employeeId) => {
  try {
    const params = new URLSearchParams({ company, employeeId });
    const res = await fetch(`/api/playCount?${params.toString()}`);
    const json = await res.json();

    if (json.status === "success" && typeof json.playCount === "number") {
      return json.playCount;
    }
    return 0;
  } catch (err) {
    console.error("참여 횟수 조회 실패:", err);
    // 장애 시에는 0회라고 치고 진행
    return 0;
  }
};

// 👉 시간/정확도에 따른 레벨 계산
const getInstantTimeLevel = (ms) => {
  const sec = ms / 1000;
  if (sec <= 10) return "good"; // 연한 파란색
  if (sec <= 20) return "ok"; // 연한 초록색
  return "bad"; // 연한 붉은색
};

const getTotalTimeLevel = (ms, round) => {
  const sec = ms / 1000;
  const blueThreshold = round * 10; // 예: 3번 문제면 30초
  const greenThreshold = round * 20; // 예: 3번 문제면 60초

  if (sec <= blueThreshold) return "good";
  if (sec <= greenThreshold) return "ok";
  return "bad";
};

const getAccuracyLevel = (accuracy) => {
  if (accuracy >= 100) return "good"; // 정확히 100%
  if (accuracy >= 80) return "ok"; // 80% 이상
  return "bad"; // 그 아래
};

// (fallback용)
const KOREAN_SAMPLES_FALLBACK = [
  "디지털 전환은 도구보다 사고방식의 변화가 더 중요합니다.",
  "작은 자동화가 모여서 퇴근 시간을 앞당깁니다.",
  "반복되는 업무일수록 컴퓨터에게 맡길 수 있습니다.",
  "복붙이 안 되는 순간이 진짜 디지털 노동의 지옥입니다.",
  "한 번 자동화된 작업은 다시는 사람이 하지 않아도 됩니다.",
];

// 공백/줄바꿈 제거용 (OCR 보정)
const normalizeInput = (s) => s.replace(/\s+/g, "");

// ==== 5번 문제용: 미리 정의한 한글 음절 풀 ====
// OCR이 잘 인식할 만한, 적당히 섞인 글자들
const HANGUL_SYLLABLE_POOL = [
  "고",
  "혀",
  "레",
  "별",
  "꿈",
  "숲",
  "칼",
  "집",
  "글",
  "빛",
  "문",
  "공",
  "점",
  "책",
  "밤",
  "달",
  "손",
  "눈",
  "맛",
  "밥",
  "숫",
  "끈",
  "길",
  "값",
];

const makeRandomHangulSyllable = () => {
  const idx = Math.floor(Math.random() * HANGUL_SYLLABLE_POOL.length);
  return HANGUL_SYLLABLE_POOL[idx];
};

// 레벤슈타인 거리 계산
const getLevenshteinDistance = (a, b) => {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 삭제
          dp[i][j - 1] + 1, // 삽입
          dp[i - 1][j - 1] + 1 // 교체
        );
      }
    }
  }

  return dp[m][n];
};

// 한글 샘플에서 "문장 전체"를 사용
const generateKoreanSnippet = (samples) => {
  if (!samples || samples.length === 0) return "";
  const base = samples[Math.floor(Math.random() * samples.length)];
  return String(base).trim();
};

// 최종 문자열 생성: 한글만 사용
const generateTargetString = (koreanSamples) => {
  const hasKorean = Array.isArray(koreanSamples) && koreanSamples.length > 0;
  if (!hasKorean) return "";
  return generateKoreanSnippet(koreanSamples);
};

// 🔢 랜덤 3자리 사칙연산 식 생성 (× 하나 + ± 하나, 음수 금지, 나눗셈 없음)
const generateArithmeticExpression = () => {
  while (true) {
    const a = 100 + Math.floor(Math.random() * 900); // 100~999
    const b = 100 + Math.floor(Math.random() * 900);
    const c = Math.floor(Math.random() * 1000); // 0~999
    const op = Math.random() < 0.5 ? "+" : "-";

    const mult = a * b;
    const result = op === "+" ? mult + c : mult - c;

    // 결과가 음수면 다시 뽑기
    if (result < 0) continue;

    const expression = `${a} × ${b} ${op} ${c}`;
    return {
      expression, // 이미지에 찍힐 식
      answer: result, // 사용자가 입력해야 할 숫자 정답
    };
  }
};

export default function App() {
  const [gameState, setGameState] = useState("start"); // start, playing, result
  const [targetString, setTargetString] = useState("");
  const [inputString, setInputString] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const [showOcrCallout, setShowOcrCallout] = useState(false);

  const [screen, setScreen] = useState("game"); // "game" | "ocr"

  // 난이도 (UI 표시용)
  const [difficulty] = useState("normal");

  // 한글 샘플: 번들에서 로딩됨 (3번 문제용)
  const [koreanSamples, setKoreanSamples] = useState([]);
  // mindset/digital 전용
  const [mindsetSamples, setMindsetSamples] = useState([]);
  const [digitalSamples, setDigitalSamples] = useState([]);

  const [isLoadingSamples, setIsLoadingSamples] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // 라운드 / 타이머 / 랭킹
  const [round, setRound] = useState(1); // 1~5
  const [lastTime, setLastTime] = useState(0); // 이번 문제 시간(ms)
  const [sessionTime, setSessionTime] = useState(0); // 5문제 누적(ms)
  const [rankings, setRankings] = useState([]); // 서버에서 가져오는 랭킹
  const [rankingLoadError, setRankingLoadError] = useState("");

  // 정확도
  const [lastAccuracy, setLastAccuracy] = useState(0);
  const [sessionAccuracySum, setSessionAccuracySum] = useState(0);
  const [sessionRounds, setSessionRounds] = useState(0);

  // 랭킹 보드 모달 (이제 입력/등록 없이 보기 전용)
  const [showRankingBoard, setShowRankingBoard] = useState(false);
  const [pendingTotalMs, setPendingTotalMs] = useState(null);
  const [pendingAvgAccuracy, setPendingAvgAccuracy] = useState(null);

  // Help 팝업
  const [showHelp, setShowHelp] = useState(false);

  // 이벤트 상품 보드
  const [showPrizeBoard, setShowPrizeBoard] = useState(false);

  const canvasRef = useRef(null);

  // 퍼즐 타입: text | arithmetic | dotCount
  const [puzzleType, setPuzzleType] = useState("text");

  const [isStarting, setIsStarting] = useState(false);

  // 👉 플레이어 정보 (시작 화면에서 입력)
  const [playerCompany, setPlayerCompany] = useState(
    localStorage.getItem("human-ocr-company") || ""
  );
  const [playerEmployeeId, setPlayerEmployeeId] = useState(
    localStorage.getItem("human-ocr-employeeId") || ""
  );
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("human-ocr-name") || ""
  );

  // 플레이 누적 횟수 (서버 기준, 1 세션 = 1회)
  const [playCount, setPlayCount] = useState(0);

  // 10판 단위로 어떤 번들을 쓸지 순서
  const [bundleOrder, setBundleOrder] = useState(() => {
    const stored = localStorage.getItem("human-ocr-bundle-order");
    if (!stored) return ["memil"]; // 0번째 segment는 무조건 메밀
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length ? parsed : ["memil"];
    } catch {
      return ["memil"];
    }
  });

  // 현재 사용 중인 번들 (3번 문제에서 활용)
  const [currentBundleId, setCurrentBundleId] = useState(
    () => (TEXT_BUNDLES[0] && TEXT_BUNDLES[0].id) || "memil"
  );

  const drawHangulScatterPuzzle = (count) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 800;
    const height = 600;
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    // 배경
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#111111";
    ctx.font =
      'bold 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 🔹 1) 매판마다 격자 크기를 랜덤으로
    //    (대략 count보다 1.3~2배 정도 많은 칸 확보)
    const minCells = Math.ceil(count * 1.3);
    const maxCells = Math.ceil(count * 2.0);
    const totalCells =
      minCells + Math.floor(Math.random() * Math.max(1, maxCells - minCells));

    // 대략 비율 맞춰서 cols/rows 결정 (너무 규칙적인 10x6 피하기)
    let cols = Math.round(Math.sqrt((totalCells * width) / height));
    cols = Math.max(7, Math.min(cols, 14)); // 7~14 사이
    let rows = Math.ceil(totalCells / cols);

    const cellW = width / cols;
    const cellH = height / rows;

    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 🔹 2) 각 셀 중심에서 약간 랜덤으로 튕겨내기 (격자 느낌 약화)
        const jitterX = (Math.random() - 0.5) * cellW * 0.4; // 최대 ±20%
        const jitterY = (Math.random() - 0.5) * cellH * 0.4;

        positions.push({
          x: c * cellW + cellW / 2 + jitterX,
          y: r * cellH + cellH / 2 + jitterY,
        });
      }
    }

    // 위치 섞고, 그중 count개만 실제로 사용
    positions.sort(() => Math.random() - 0.5);
    const useCount = Math.min(count, positions.length);

    for (let i = 0; i < useCount; i++) {
      const { x, y } = positions[i];
      const syllable = makeRandomHangulSyllable();
      ctx.fillText(syllable, x, y);
    }

    setImageUrl(canvas.toDataURL("image/png"));
  };



  // 번들 로딩 플래그
  const [isBundleLoading, setIsBundleLoading] = useState(false);

  // 번들 ID로 해당 json 로드해서 segments 배열 리턴 (3번 문제용)
  const loadBundle = async (bundleId) => {
    setIsBundleLoading(true);
    try {
      const bundle =
        TEXT_BUNDLES.find((b) => b.id === bundleId) || TEXT_BUNDLES[0];
      const res = await fetch(
        (process.env.PUBLIC_URL || "") + "/" + bundle.file
      );
      const data = await res.json();

      let items;
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data.segments)) {
        items = data.segments;
      } else if (Array.isArray(data.items)) {
        items = data.items;
      } else {
        items = [];
      }

      if (!items.length) {
        items = KOREAN_SAMPLES_FALLBACK;
      }

      setKoreanSamples(items);
      setCurrentBundleId(bundleId);
      return items;
    } catch (err) {
      console.error("번들 로드 실패:", bundleId, err);
      setKoreanSamples(KOREAN_SAMPLES_FALLBACK);
      return KOREAN_SAMPLES_FALLBACK;
    } finally {
      setIsBundleLoading(false);
    }
  };

  // 처음 로드시: bundleOrder[0] 기준으로 번들 로딩 (3번 문제용 준비)
  useEffect(() => {
    const initialBundleId = bundleOrder[0] || "memil";
    loadBundle(initialBundleId);    
  }, []);

  // 🔹 1) memil + mindset + digital 로딩 + 최소 2초 로딩 (typewriter용)
  useEffect(() => {
    let isMounted = true;

    const loadAllTexts = async () => {
      const start = Date.now();

      try {
        const publicUrl = process.env.PUBLIC_URL || "";

        // memil, mindset, digital 한 번에 로딩
        const [memilRes, mindsetRes, digitalRes] = await Promise.all([
          fetch(publicUrl + "/memil.json"),
          fetch(publicUrl + "/mindset.json"),
          fetch(publicUrl + "/digital.json"),
        ]);

        // memil
        let memilItems = [];
        if (!memilRes.ok) throw new Error("memil HTTP " + memilRes.status);
        const memilData = await memilRes.json();
        if (Array.isArray(memilData)) {
          memilItems = memilData;
        } else if (Array.isArray(memilData.segments)) {
          memilItems = memilData.segments;
        } else if (Array.isArray(memilData.items)) {
          memilItems = memilData.items;
        }

        // mindset
        let mindsetItems = [];
        if (mindsetRes.ok) {
          const mData = await mindsetRes.json();
          if (Array.isArray(mData)) {
            mindsetItems = mData;
          } else if (Array.isArray(mData.segments)) {
            mindsetItems = mData.segments;
          } else if (Array.isArray(mData.items)) {
            mindsetItems = mData.items;
          }
        }

        // digital
        let digitalItems = [];
        if (digitalRes.ok) {
          const dData = await digitalRes.json();
          if (Array.isArray(dData)) {
            digitalItems = dData;
          } else if (Array.isArray(dData.segments)) {
            digitalItems = dData.segments;
          } else if (Array.isArray(dData.items)) {
            digitalItems = dData.items;
          }
        }

        const elapsed = Date.now() - start;
        const remain = Math.max(0, 2000 - elapsed); // 최소 2초

        setTimeout(() => {
          if (!isMounted) return;

          if (!memilItems.length) {
            setLoadError("memil.json에서 사용할 문장을 찾지 못했습니다.");
          } else {
            setKoreanSamples((prev) =>
              prev && prev.length ? prev : memilItems
            );
          }

          setMindsetSamples(
            mindsetItems.length ? mindsetItems : KOREAN_SAMPLES_FALLBACK
          );
          setDigitalSamples(
            digitalItems.length ? digitalItems : KOREAN_SAMPLES_FALLBACK
          );

          setIsLoadingSamples(false);
        }, remain);
      } catch (err) {
        console.error("텍스트 로딩 실패:", err);
        const elapsed = Date.now() - start;
        const remain = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          if (!isMounted) return;
          setLoadError(
            "텍스트 로딩에 실패했습니다. 새로고침 후 다시 시도해주세요."
          );
          setIsLoadingSamples(false);
        }, remain);
      }
    };

    loadAllTexts();
    return () => {
      isMounted = false;
    };
  }, []);

  // 다음 플레이 번호(nextPlay)에 사용할 번들 결정 (3번 문제 로직에서 사용)
  const decideBundleForPlay = (nextPlay, currentOrder) => {
    const segmentIdx = Math.floor((nextPlay - 1) / 10); // 0:1~10, 1:11~20 ...

    const totalBundles = TEXT_BUNDLES.length;
    let order = [...currentOrder];

    // 0번 segment는 항상 memil
    if (segmentIdx === 0) {
      if (!order[0]) order[0] = "memil";
      return { bundleId: "memil", order };
    }

    // 아직 모든 번들을 한 번씩 쓰지 않은 구간
    if (segmentIdx < totalBundles) {
      if (order[segmentIdx]) {
        return { bundleId: order[segmentIdx], order };
      }

      const used = new Set(order.filter(Boolean));
      const candidates = TEXT_BUNDLES.map((b) => b.id).filter(
        (id) => !used.has(id)
      );

      const pool = candidates.length
        ? candidates
        : TEXT_BUNDLES.map((b) => b.id);

      const picked = pool[Math.floor(Math.random() * pool.length)];
      order[segmentIdx] = picked;
      return { bundleId: picked, order };
    }

    // 전체 번들을 다 돈 이후
    const anyId =
      TEXT_BUNDLES[Math.floor(Math.random() * TEXT_BUNDLES.length)].id;

    return { bundleId: anyId, order };
  };

  // 🔹 2) 첫 진입 시 서버에서 랭킹 가져오기 (백엔드 프록시 경유)
  const fetchRankingFromServer = async () => {
    try {
      setRankingLoadError("");
      const res = await fetch("/api/ranking");
      const json = await res.json();

      if (json.status === "success" && Array.isArray(json.data)) {
        setRankings(json.data);
      } else {
        setRankingLoadError(
          json.message || "랭킹 데이터를 불러오지 못했습니다."
        );
        setRankings([]);
      }
    } catch (err) {
      console.error("랭킹 조회 실패:", err);
      setRankingLoadError("네트워크/CORS 문제로 랭킹을 불러오지 못했습니다.");
      setRankings([]);
    }
  };

  useEffect(() => {
    fetchRankingFromServer();
  }, []);

  useEffect(() => {
    if (showRankingBoard) {
      fetchRankingFromServer();
    }
  }, [showRankingBoard]);

  // 🔹 캔버스에 "문단"처럼 텍스트 그리기 (1~4번 문제용)
  const drawTextBlock = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext("2d");

    const width = 800;
    const fontSize = 24;
    const lineHeight = fontSize * 1.6;
    const paddingX = 40;
    const paddingY = 40;
    const maxWidth = width - paddingX * 2;

    // 1) 먼저 줄 나누기 (height 계산용)
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = "top";

    const lines = [];
    const paragraphs = String(text).split(/\r?\n/);

    paragraphs.forEach((para, pIdx) => {
      let line = "";

      for (const ch of para) {
        const testLine = line + ch;
        const { width: w } = ctx.measureText(testLine);
        if (w > maxWidth && line !== "") {
          lines.push(line);
          line = ch;
        } else {
          line = testLine;
        }
      }

      if (line) lines.push(line);
      if (pIdx < paragraphs.length - 1) {
        lines.push(""); // 단락 간 빈 줄
      }
    });

    if (lines.length === 0) return;

    // 2) 텍스트 높이에 맞춰 캔버스 height 계산 (여백 포함)
    const textBlockHeight = lineHeight * lines.length;
    const baseHeight = textBlockHeight + paddingY * 2;
    const height = Math.max(260, baseHeight); // 너무 찌그러지지 않게 최소 높이

    // 3) 실제 캔버스 크기 설정
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = "top";

    // 4) 원고지 느낌 배경
    ctx.fillStyle = "#f1f1f1";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e1e1e1";
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffb4b8";
    ctx.fillRect(50, 0, 2, height);

    const startY = (height - textBlockHeight) / 2;
    ctx.fillStyle = "#111111";
    lines.forEach((ln, i) => {
      ctx.fillText(ln, paddingX, startY + i * lineHeight);
    });

    setImageUrl(canvas.toDataURL("image/png"));
  };

  // 🔹 5번 문제: ● 텍스트로 찍어서 OCR이 읽을 수 있게 만들기
  const drawDotCharsPuzzle = (count) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const width = 800;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // 흰 배경 (렌즈 잘 읽으라고)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const fontSize = 36;
    const lineHeight = fontSize * 1.5;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif`;
    ctx.fillStyle = "#111111";
    ctx.textBaseline = "top";

    // ●●●●● 를 여러 줄로 나누기
    const maxPerLine = 15; // 한 줄 최대 개수
    let remaining = count;
    const lines = [];

    while (remaining > 0) {
      const take = Math.min(
        maxPerLine,
        remaining,
        5 + Math.floor(Math.random() * 10) // 5~14 사이 랜덤
      );
      lines.push("●".repeat(take));
      remaining -= take;
    }

    const textBlockHeight = lines.length * lineHeight;
    let y = (height - textBlockHeight) / 2;

    lines.forEach((line) => {
      const textWidth = ctx.measureText(line).width;
      const x = (width - textWidth) / 2; // 가운데 정렬
      ctx.fillText(line, x, y);
      y += lineHeight;
    });

    setImageUrl(canvas.toDataURL("image/png"));
  };

  // 🔹 흰 배경에 텍스트만 깔끔하게 (4라운드용)
  const drawTextOnWhite = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = canvas.getContext("2d");

    const width = 800;
    const fontSize = 28;
    const lineHeight = fontSize * 1.4;
    const paddingX = 40;
    const paddingY = 40;
    const maxWidth = width - paddingX * 2;

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = "top";

    const lines = [];
    let line = "";

    for (const ch of String(text)) {
      const testLine = line + ch;
      const { width: w } = ctx.measureText(testLine);
      if (w > maxWidth && line !== "") {
        lines.push(line);
        line = ch;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    const textBlockHeight = lineHeight * lines.length;
    const baseHeight = textBlockHeight + paddingY * 2;
    const height = Math.max(200, baseHeight);

    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");

    // 🔵 완전 흰 배경
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const startY = (height - textBlockHeight) / 2;

    ctx.fillStyle = "#111827";
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif`;
    ctx.textBaseline = "top";

    lines.forEach((ln, i) => {
      ctx.fillText(ln, paddingX, startY + i * lineHeight);
    });

    setImageUrl(canvas.toDataURL("image/png"));
  };

  // 🔹 5번 문제용: 랜덤 ⚫ 패턴 그리기
  // 🔹 5번 문제용: 랜덤 ⚫ 패턴 (서로 겹치지 않게)
  const drawDotPuzzle = (count) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const width = 800;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // 🔵 완전 흰 배경
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const margin = 30;
    const radius = 7;
    const minGap = 4; // 점들 사이 최소 간격
    const minDistSq = (radius * 2 + minGap) ** 2;

    const centers = [];
    const maxAttemptsPerDot = 500;

    for (let i = 0; i < count; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < maxAttemptsPerDot) {
        attempts++;
        const x = margin + Math.random() * (width - margin * 2);
        const y = margin + Math.random() * (height - margin * 2);

        let ok = true;
        for (const { x: cx, y: cy } of centers) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy < minDistSq) {
            ok = false;
            break;
          }
        }

        if (ok) {
          centers.push({ x, y });
          placed = true;
        }
      }
    }

    ctx.fillStyle = "#111827";
    centers.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    setImageUrl(canvas.toDataURL("image/png"));
  };

  // 🔹 정확도 계산
  const calculateAccuracy = () => {
    // 4번(사칙연산), 5번(점 카운트)는 0% / 100% 채점
    if (puzzleType === "arithmetic" || puzzleType === "dotCount") {
      const expected = Number(targetString);
      const user = Number(inputString.trim());

      if (!Number.isFinite(expected) || Number.isNaN(user)) return 0;
      return expected === user ? 100 : 0;
    }

    // 나머지(1~3번 텍스트)는 기존 레벤슈타인 로직 그대로
    if (!targetString) return 0;
    const cleanTarget = normalizeInput(targetString);
    const cleanInput = normalizeInput(inputString);
    if (!cleanInput) return 0;

    const distance = getLevenshteinDistance(cleanTarget, cleanInput);
    const raw = ((cleanTarget.length - distance) / cleanTarget.length) * 100;
    return Math.max(0, Math.round(raw));
  };

  // 🔹 게임 시작 (라운드별 출제 로직)
  const startGame = async (basePlayCount, roundForGame) => {
    const effectivePlayCount =
      typeof basePlayCount === "number" ? basePlayCount : playCount;

    const nextPlay = effectivePlayCount + 1;
    setPlayCount(nextPlay);

    const effectiveRound =
      typeof roundForGame === "number" ? roundForGame : round;

    let textForImage = "";

    // 1번 문제: mindset.json (20자 문장)
    if (effectiveRound === 1) {
      const source =
        mindsetSamples && mindsetSamples.length
          ? mindsetSamples
          : koreanSamples;

      textForImage = generateTargetString(source);
      drawTextBlock(textForImage); // 원고지 배경
      setTargetString(textForImage);
      setPuzzleType("text");
    }
    // 2번 문제: digital.json (50자 문장)
    else if (effectiveRound === 2) {
      const source =
        digitalSamples && digitalSamples.length
          ? digitalSamples
          : koreanSamples;

      textForImage = generateTargetString(source);
      drawTextBlock(textForImage); // 원고지 배경
      setTargetString(textForImage);
      setPuzzleType("text");
    }
    // 3번 문제: 기존 소설 번들
    else if (effectiveRound === 3) {
      let samples = koreanSamples;

      const { bundleId, order } = decideBundleForPlay(nextPlay, bundleOrder);

      if (JSON.stringify(order) !== JSON.stringify(bundleOrder)) {
        setBundleOrder(order);
        localStorage.setItem("human-ocr-bundle-order", JSON.stringify(order));
      }

      if (bundleId !== currentBundleId || !koreanSamples.length) {
        samples = await loadBundle(bundleId);
      }

      textForImage = generateTargetString(samples);
      drawTextBlock(textForImage); // 원고지 배경
      setTargetString(textForImage);
      setPuzzleType("text");
    }
    // 4번 문제: 사칙연산 (식은 이미지, 정답은 숫자)
    else if (effectiveRound === 4) {
      const { expression, answer } = generateArithmeticExpression();
      drawTextOnWhite(expression); // 🔵 흰 배경 + 수식 텍스트
      setTargetString(String(answer)); // 정답은 숫자
      setPuzzleType("arithmetic"); // 채점은 0 / 100
    }
    // 5번 문제: 랜덤 한글 글자 30~50개 카운트
    else if (effectiveRound === 5) {
      const charCount = 30 + Math.floor(Math.random() * 21); // 30~50개
      drawHangulScatterPuzzle(charCount); // 🔵 흰 배경에 한글 글자들 흩뿌리기
      setTargetString(String(charCount)); // 정답: 글자 개수 숫자
      setPuzzleType("dotCount"); // 0 / 100 채점 로직 재사용
    }

    // 혹시 모를 예외 라운드용 fallback
    else {
      const source =
        koreanSamples && koreanSamples.length
          ? koreanSamples
          : KOREAN_SAMPLES_FALLBACK;

      textForImage = generateTargetString(source);
      drawTextBlock(textForImage);
      setTargetString(textForImage);
      setPuzzleType("text");
    }

    setInputString("");
    setShowOcrCallout(false); // 이전 라운드에서 켜져 있던 비밀 도구 콜아웃 초기화
    setGameState("playing");
    setStartTime(Date.now());
  };

  // 🔹 제출
  const handleSubmit = () => {
    if (!startTime) return;
    const now = Date.now();
    const elapsed = now - startTime;

    const acc = calculateAccuracy();
    setLastTime(elapsed);
    setSessionTime((prev) => prev + elapsed);
    setLastAccuracy(acc);
    setSessionAccuracySum((prev) => prev + acc);
    setSessionRounds((prev) => prev + 1);

    setGameState("result");
  };

  // 🔹 서버로 랭킹 자동 전송 (백엔드 프록시 경유)
  const autoSubmitRanking = async (totalMs, avgAccuracy) => {
    try {
      const payload = {
        company: playerCompany,
        employeeId: playerEmployeeId,
        name: playerName,
        timeTaken: Number((totalMs / 1000).toFixed(2)),
        accuracy: Number(avgAccuracy.toFixed(2)),
        quizResults: {
          totalMs,
          avgAccuracy,
          rounds: sessionRounds,
        },
      };

      const res = await submitRecord(payload);

      if (res.status !== "success") {
        console.warn("랭킹 자동 제출 응답:", res);
      }
    } catch (err) {
      console.error("랭킹 자동 제출 실패:", err);
    }
  };

  // 🔹 다음 문제 or 세션 종료
  const handleNextOrRestart = () => {
    setShowOcrCallout(false);

    if (round >= 5) {
      const avg = sessionRounds > 0 ? sessionAccuracySum / sessionRounds : 0;

      setPendingTotalMs(sessionTime);
      setPendingAvgAccuracy(avg);

      autoSubmitRanking(sessionTime, avg);
      fetchRankingFromServer();

      setShowRankingBoard(true);
    } else {
      const nextRound = round + 1;
      setRound(nextRound);
      startGame(undefined, nextRound);
    }
  };

  // 🔹 다시하기
  const handleRestart = () => {
    setRound(1);
    setSessionTime(0);
    setLastTime(0);
    setInputString("");
    setImageUrl(null);

    setPendingTotalMs(null);
    setPendingAvgAccuracy(null);

    setLastAccuracy(0);
    setSessionAccuracySum(0);
    setSessionRounds(0);

    setShowRankingBoard(false);
    setShowOcrCallout(false);
    setGameState("start");
  };

  const currentCleanLength = normalizeInput(inputString).length; // 채점용
  const currentRawLength = inputString.length;                   // 진행률 표시용
  const lastSeconds = (lastTime / 1000).toFixed(2);
  const sessionSeconds = (sessionTime / 1000).toFixed(2);


  const instantTimeLevel = getInstantTimeLevel(lastTime);
  const totalTimeLevel = getTotalTimeLevel(sessionTime, round);
  const accuracyLevel = getAccuracyLevel(lastAccuracy);

  // 10초 이내 + 정확도 80% 이상일 때만 "진짜 잘 쓴 플레이"
  const isFastAndAccurate =
    lastTime > 0 && lastTime <= 20000 && lastAccuracy >= 80;

  const canStart =
    !isLoadingSamples &&
    !loadError &&
    playerCompany.trim() &&
    playerEmployeeId.trim() &&
    playerName.trim();

  const currentBundleLabel =
    TEXT_BUNDLES.find((b) => b.id === currentBundleId)?.label ||
    "메밀꽃 필 무렵";

  const handleStartClick = async () => {
    const company = playerCompany.trim();
    const employeeId = playerEmployeeId.trim();
    const name = playerName.trim();

    // 🔹 누락 항목 체크
    const missing = [];
    if (!company) missing.push("회사");
    if (!employeeId) missing.push("사번");
    if (!name) missing.push("이름");

    if (missing.length > 0) {
      // 브라우저 기본 alert 팝업 사용
      alert(`${missing.join(", ")} 정보가 비어 있습니다.\n모두 입력해 주세요.`);
      return;
    }

    setIsStarting(true);
    const start = Date.now();

    try {
      // 1) 서버에서 참여 횟수 조회
      const serverCount = await fetchPlayCountFromServer(company, employeeId);
      setPlayCount(serverCount);

      // 새 세션 시작이니 라운드 초기화
      setRound(1);

      // 2) 그 값을 기반으로 실제 게임 시작 (1번 문제부터)
      await startGame(serverCount, 1);
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 2000 - elapsed);

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setIsStarting(false);
    }
  };


  // 렌더링
  return screen === "ocr" ? (
    // 🔵 OCR 설명 페이지 모드
    <OcrExplainer onBack={() => setScreen("game")} />
  ) : (
    // 🔴 게임 화면
    <div className="App">
      {/* 상단 헤더 + 히어로 영역 */}
      <header className="app-hero">
        <div className="top-bar">
          <div className="brand">
            <span className="brand-mark">⌨️</span>
            <span className="brand-name">나는 더이상 타이핑하지 않는다</span>
          </div>
        </div>

        <div className="hero-copy">
          {/* <p className="hero-kicker">Human OCR 챌린지</p> */}
          <p className="hero-subtitle">"타이핑도 가능은 하지만..."</p>
        </div>
      </header>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Help 모달 */}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div
            className="modal help-modal fancy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-header">
              <div className="help-title-row">
                <h2>🔍 이미지에서 텍스트 뽑기</h2>
                <span className="help-tag">Google 렌즈 사용법</span>
              </div>
              <p className="help-subtitle">
                이미지를 그냥 보지 말고, 텍스트로 뽑아서 붙여넣기까지 해보는
                루틴입니다.
              </p>
            </div>

            <div className="help-body">
              {/* 🔍 OCR 시연 GIF */}
              <div className="help-visual">
                <img
                  src={process.env.PUBLIC_URL + "/images/ocr.gif"}
                  alt="브라우저에서 Google 렌즈로 텍스트를 추출하는 시연 화면"
                  className="help-visual-image"
                />
              </div>

              <ol className="help-steps">
                <li className="help-step-row">
                  <span className="help-step-badge">1</span>
                  <span className="help-step-text">
                    크롬에서 이 페이지 이미지를 <strong>마우스 오른쪽 클릭</strong>합니다.
                  </span>
                </li>
                <li className="help-step-row">
                  <span className="help-step-badge">2</span>
                  <span className="help-step-text">
                    메뉴에서 <strong>“Google 렌즈로 검색”</strong>을 선택합니다.
                  </span>
                </li>
                <li className="help-step-row">
                  <span className="help-step-badge">3</span>
                  <span className="help-step-text">
                    렌즈 화면에서 <strong>텍스트 영역을 드래그해서 선택</strong>합니다.
                  </span>
                </li>
                <li className="help-step-row">
                  <span className="help-step-badge">4</span>
                  <span className="help-step-text">
                    <strong>“텍스트 복사”</strong> 버튼을 눌러 클립보드에 담습니다.
                  </span>
                </li>
                <li className="help-step-row">
                  <span className="help-step-badge">5</span>
                  <span className="help-step-text">
                    이 페이지의 입력창에 <strong>붙여넣기(Ctrl+V)</strong> 하면 끝!
                  </span>
                </li>
              </ol>

              <p className="help-hint">
                이 과정을 몇 번 반복해 보면,
                <br />
                “이걸 왜 맨날 손으로 치고 있었지…?” 하는 순간이 한 번은 옵니다.
              </p>

              <button
                type="button"
                className="help-ocr-link"
                onClick={() => {
                  setShowHelp(false);
                  setScreen("ocr");
                }}
              >
                OCR이 뭔지 더 궁금하다면
                <span className="help-ocr-link-arrow">→</span>
              </button>
            </div>


            <div className="help-footer">
              <button
                className="btn secondary full"
                onClick={() => setShowHelp(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 랭킹 보드 모달 */}
      {showRankingBoard && (
        <div
          className="modal-backdrop ranking-backdrop"
          onClick={() => setShowRankingBoard(false)}
        >
          <div
            className="modal ranking-modal fancy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ranking-header">
              <div className="ranking-title-row">
                <h2>🏆 전체 랭킹</h2>
                <span className="ranking-tag">실시간</span>
              </div>
              {pendingTotalMs !== null && pendingAvgAccuracy !== null && (
                <div className="ranking-my-session">
                  <div className="my-session-label">이번 세션 요약</div>
                  <div className="my-session-main">
                    <div className="my-session-user">
                      <span className="pill pill-me">YOU</span>
                      <span className="my-session-name">
                        [{playerCompany}] {playerName} ({playerEmployeeId})
                      </span>
                    </div>
                    <div className="my-session-stats">
                      <span>⏱ {(pendingTotalMs / 1000).toFixed(2)}초</span>
                      <span>·</span>
                      <span>🎯 {pendingAvgAccuracy.toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="my-session-caption">
                    이 기록은 자동으로 서버 랭킹에 반영됩니다.
                  </p>
                </div>
              )}
            </div>

            <div className="ranking-scroll">
              {rankingLoadError && (
                <p className="hint error-text">{rankingLoadError}</p>
              )}

              {rankings.length > 0 && !rankingLoadError && (
                <ol className="ranking-list fancy-list">
                  {rankings.map((r, idx) => {
                    const isMe =
                      r.company === playerCompany &&
                      String(r.employeeId) === String(playerEmployeeId);

                    return (
                      <li
                        key={r.company + "_" + r.employeeId}
                        className={`ranking-item ${isMe ? "me" : ""}`}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="ranking-left">
                          <div
                            className={`rank-badge ${
                              r.rank === 1
                                ? "gold"
                                : r.rank === 2
                                ? "silver"
                                : r.rank === 3
                                ? "bronze"
                                : ""
                            }`}
                          >
                            {r.rank}
                          </div>
                          <div className="ranking-user-info">
                            <div className="name-row">
                              <span className="company">[{r.company}]</span>
                              <span className="name">{r.name}</span>
                              <span className="employee">({r.employeeId})</span>
                              {isMe && (
                                <span className="pill pill-me-small">나</span>
                              )}
                            </div>
                            <div className="meta-row">
                              <span>정확도 {r.accuracy.toFixed(1)}%</span>
                              <span className="dot">·</span>
                              <span>{r.time.toFixed(2)}초</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {rankings.length === 0 && !rankingLoadError && (
                <p className="hint empty-text">
                  아직 서버에 기록이 없습니다. 첫 기록의 주인공이 되어볼까요?
                </p>
              )}
            </div>

            <div className="ranking-actions">
              {pendingTotalMs !== null && pendingAvgAccuracy !== null ? (
                <button className="btn primary full" onClick={handleRestart}>
                  다시 도전하기
                </button>
              ) : (
                <button
                  className="btn secondary full"
                  onClick={() => setShowRankingBoard(false)}
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이벤트 상품 보드 모달 */}
      <EventPrizeBoard
        open={showPrizeBoard}
        onClose={() => setShowPrizeBoard(false)}
      />

      {/* 🔵 로딩 상태: typewriter 애니메이션 */}
      {(isLoadingSamples || isBundleLoading || isStarting) && (
        <div
          style={{
            marginTop: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div className="typewriter">
            <div className="slide">
              <i></i>
            </div>
            <div className="paper"></div>
            <div className="keyboard"></div>
          </div>
          <p className="hint">문제를 불러오는 중입니다...</p>
        </div>
      )}

      {/* 🔴 로딩 에러 */}
      {!isLoadingSamples && loadError && (
        <div className="card" style={{ marginTop: "40px" }}>
          <h3>텍스트 로딩 실패</h3>
          <p>{loadError}</p>
          <p className="hint">페이지를 새로고침해서 다시 시도해 주세요.</p>
        </div>
      )}

      {/* 실제 게임 화면 */}
      {!isLoadingSamples && !isBundleLoading && !isStarting && !loadError && (
        <>
          {/* START 화면 */}
          {gameState === "start" && (
            <div className="card start-card">
              <div className="start-header">
                <p>
                  이것은 '손끝 노동'의 시대와 <strong>'기술적 효율'</strong>의
                  시대를
                  <br />
                  직접 비교 체험하는 작은 도전입니다
                </p>
                <div className="start-meta">
                  <span className="start-meta-sub">
                    5문제가 연속으로 출제됩니다.
                  </span>
                </div>
              </div>

              <div className="start-form">
                {/* 회사 */}
                <div className="form-control">
                  <input
                    type="text"
                    value={playerCompany}
                    onChange={(e) => setPlayerCompany(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label>
                    <span style={{ transitionDelay: "0ms" }}>회</span>
                    <span style={{ transitionDelay: "50ms" }}>사</span>
                  </label>
                </div>

                {/* 사번 */}
                <div className="form-control">
                  <input
                    type="text"
                    value={playerEmployeeId}
                    onChange={(e) => setPlayerEmployeeId(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label>
                    <span style={{ transitionDelay: "0ms" }}>사</span>
                    <span style={{ transitionDelay: "50ms" }}>번</span>
                  </label>
                </div>

                {/* 이름 */}
                <div className="form-control">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label>
                    <span style={{ transitionDelay: "0ms" }}>이</span>
                    <span style={{ transitionDelay: "50ms" }}>름</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleStartClick}
                className="btn primary full start-button"
              >
                START
              </button>

              <div className="start-sub-actions">
                <button
                  type="button"
                  className="btn secondary start-sub-button"
                  onClick={() => setShowRankingBoard(true)}
                >
                  🏆 전체 랭킹 보기
                </button>
                <button
                  type="button"
                  className="btn secondary start-sub-button"
                  onClick={() => setShowPrizeBoard(true)}
                >
                  🎁 이벤트 상품 보기
                </button>
              </div>


            </div>
          )}

          {/* PLAYING 화면 */}
          {gameState === "playing" && imageUrl && (
            <div className="card play-card">
              <div className="play-header">
                <div className="play-header-main">
                  <span className="pill play-pill">문제 {round} / 5</span>
                </div>
              </div>

              <div className="image-shell">
                <div className="hint-badge">
                  {round === 5 ? (
                    <>💡 화면 속 글자 개수를 세고, 숫자로 입력해 보세요.</>
                  ) : (
                    <>
                      💡 보이는 것을 그대로 가져오려면, 세상을 다른 시선으로
                      바라볼 도구가 필요해요.
                    </>
                  )}
                </div>

                <div className="image-container">
                  <img src={imageUrl} alt="Puzzle" draggable="false" />
                </div>
              </div>

              <div className="playing-input">
                {round <= 3 && (
                  <>
                    {puzzleType === "text" && (
                      <div className="play-progress">
                        <span>
                          진행률 :{" "}
                          {Math.min(currentRawLength, targetString.length)}자
                          / {targetString.length}자
                        </span>
                        <span className="small-hint">
                          (줄바꿈·띄어쓰기는 자동 무시)
                        </span>
                      </div>
                    )}

                    <textarea
                      className="play-textarea"
                      value={inputString}
                      onChange={(e) => setInputString(e.target.value)}
                      placeholder=" 텍스트를 입력해 주세요"
                      spellCheck="false"
                    />
                  </>
                )}

                {round >= 4 && (
                  <input
                    className="play-number-input"
                    type="number"
                    value={inputString}
                    onChange={(e) => setInputString(e.target.value)}
                    placeholder={
                      round === 4
                        ? " 정답 숫자를 입력해 주세요"
                        : " 글자 개수를 숫자로 입력해 주세요"
                    }
                  />
                )}

                <button onClick={handleSubmit} className="btn success full">
                  제출하기
                </button>
              </div>
            </div>
          )}

          {/* RESULT 화면 */}
          {gameState === "result" && (
            <div className="card result-card">
              <div className="result-header">
                <div className="result-title-row">
                  <h2>결과 요약</h2>
                  <span className="result-pill">문제 {round} / 5</span>
                </div>
                <p className="result-subtitle">
                  이번 한 문제에서, 당신의 손끝 노동과 기술적 효율 중 어느 쪽이
                  승리했을까요?
                </p>
              </div>

              <div className="result-stats">
                <div className={`result-stat result-stat-${instantTimeLevel}`}>
                  <span className="label">이번 소요시간</span>
                  <strong>{lastSeconds}초</strong>
                </div>
                <div className={`result-stat result-stat-${totalTimeLevel}`}>
                  <span className="label">누적 소요시간</span>
                  <strong>{sessionSeconds}초</strong>
                </div>
                <div className={`result-stat result-stat-${accuracyLevel}`}>
                  <span className="label">정확도</span>
                  <strong>{lastAccuracy}%</strong>
                </div>
              </div>

              <div className="result-lesson">
                <p className="result-message">
                  {round <= 2 ? (
                    <>때로는 손가락이 더 빠르죠?</>
                  ) : isFastAndAccurate ? (
                    <>
                      이 정도 속도면 이미 OCR이든 자동화 툴이든 꽤 잘 활용하고
                      있는 쪽이에요.
                      <br />
                      손가락보다 뇌를 더 쓰고 있다는 증거 👏
                    </>
                  ) : (
                    <>
                      보이지 않는 곳에 시간을 절약해 줄{" "}
                      <button
                        type="button"
                        className="secret-word-button"
                        data-text="비밀 도구"
                        onClick={() => setShowOcrCallout((prev) => !prev)}
                      >
                        <span className="secret-word-main">비밀 도구</span>
                        <span className="hover-text" aria-hidden="true">
                          비밀 도구
                        </span>
                      </button>

                      가 당신을 기다리고 있었을지도 모릅니다
                    </>
                  )}
                </p>

                {showOcrCallout && (
                  <div className="result-quote">
                    <button className="tooltip-container" onClick={() => setShowHelp(true)}>
                      {/* 🔮 움직이는 비밀 배경 (클리핑 + 폴리곤 + 그라데이션 한 방에) */}
                      <div className="secret-bg" aria-hidden="true">
                        <div className="loader">
                          <svg width="100" height="100" viewBox="0 0 100 100">
                            <defs>
                              <mask id="clipping">
                                <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
                                <polygon points="25,25 75,25 50,75" fill="white"></polygon>
                                <polygon points="50,25 75,75 25,75" fill="white"></polygon>
                                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                              </mask>
                            </defs>
                          </svg>
                          <div className="box"></div>
                        </div>
                      </div>
                      <span className="text">비밀 도구</span>
                      <span>자세히 보기</span>
                    </button>


                  </div>
                )}

                <p className="hint result-hint">
                  줄바꿈과 띄어쓰기는 채점에서 자동으로 무시됩니다. 글자만
                  맞으면 OK.
                </p>
              </div>

              <div className="result-actions">
                <button
                  onClick={handleNextOrRestart}
                  className="btn primary full"
                >
                  {round >= 5 ? "랭킹 보드 보기" : "다음 문제 풀기"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
