// src/OcrExplainer.js
import React from "react";
import "./styles.css";

export default function OcrExplainer({ onBack }) {
  return (
    <div className="App ocr-page">
      {/* 상단 히어로 */}
      <header className="app-hero">
        <div className="top-bar">
          <div className="brand">
            <span className="brand-mark">📸</span>
            <span className="brand-name">OCR 이해하기</span>
          </div>
        </div>

        <div className="hero-copy">
          <p className="hero-kicker">이미지에서 글자 뽑는 그 마법</p>
          <p className="hero-subtitle">
            사람의 눈과 뇌를 대신해서, 컴퓨터가 탐정처럼 글자를 읽는 과정을 네
            단계로 풀어봤어요.
          </p>
        </div>
      </header>

      {/* 본문 카드 */}
      <main>
        <div className="card ocr-explainer-card">
          <p className="ocr-intro">
            OCR(광학 문자 인식)은{" "}
            <strong>“이미지 속 글자를 진짜 텍스트로 바꾸는 기술”</strong>
            이에요. 복잡한 수식보다는, 네 단계로 진행되는{" "}
            <strong>베테랑 탐정의 수사</strong>라고 생각하면 이해가 더 편합니다.
          </p>

          {/* STEP 1 */}
          <section className="ocr-step">
            {/* <div className="ocr-step-header">
              <span className="ocr-step-badge">STEP 1</span>
              <h2>전처리 – 사건 현장 정리</h2>
            </div> */}

            {/* 🔍 STEP 1 이미지 */}
            <div className="ocr-step-visual">
              <img
                src={process.env.PUBLIC_URL + "/images/pretrain.png"}
                alt="OCR에서 전처리 단계: 원본 이미지가 보정되는 예시"
              />
            </div>

            <p className="ocr-label">🧹 비유</p>
            <p>
              탐정이 지문 채취를 위해 현장을 깨끗하게 정리하고, 불필요한
              그림자·먼지를 치우는 단계입니다.
            </p>

            <p className="ocr-label">💻 실제 동작</p>
            <p>
              컴퓨터는 먼저 이미지를 &quot;읽기 좋은 상태&quot;로 정리합니다.
            </p>
            <ul>
              <li>기울어진 글자를 똑바로 펴고(기울기 보정)</li>
              <li>사진의 노이즈·얼룩을 제거하고(노이즈 제거)</li>
              <li>
                컬러 이미지를 글자(검은색)와 배경(흰색)만 남긴 흑백 이미지로
                바꿉니다(이진화).
              </li>
            </ul>
          </section>

          {/* STEP 2 */}
          <section className="ocr-step">
            {/* <div className="ocr-step-header">
              <span className="ocr-step-badge">STEP 2</span>
              <h2>영역 분리 – 수사 대상 특정</h2>
            </div> */}

            {/* 🔍 STEP 2 이미지 */}
            <div className="ocr-step-visual">
              <img
                src={process.env.PUBLIC_URL + "/images/specific.png"}
                alt="문단, 줄, 글자 단위로 이미지가 분리되는 예시"
              />
            </div>

            <p className="ocr-label">🔍 비유</p>
            <p>
              정리된 현장에서 사람 발자국, 타이어 자국, 담배꽁초를 각각 따로
              구분해서 보는 과정입니다.
            </p>

            <p className="ocr-label">💻 실제 동작</p>
            <p>이미지 안에서 글자가 있는 부분만 찾아내고 점점 잘게 쪼갭니다.</p>
            <ul>
              <li>먼저 문단 영역을 찾고</li>
              <li>그 안에서 줄(line)을 나누고</li>
              <li>마지막으로 낱글자 단위로 잘게 분리합니다.</li>
            </ul>
            <p>
              글자들이 서로 들러붙어 있는 디자인(예: 나선형, 겹쳐진 글자)일수록{" "}
              <strong>이 단계에서부터 인식률이 훅 떨어집니다.</strong>
            </p>
          </section>

          {/* STEP 3 */}
          <section className="ocr-step">
            {/* <div className="ocr-step-header">
              <span className="ocr-step-badge">STEP 3</span>
              <h2>특징 추출 &amp; 인식 – 몽타주 &amp; 수배자 명단 대조</h2>
            </div> */}

            {/* 🔍 STEP 3 이미지 */}
            <div className="ocr-step-visual">
              <img
                src={process.env.PUBLIC_URL + "/images/feature.png"}
                alt="글자의 특징이 벡터로 추출되고 인식되는 예시"
              />
            </div>

            <p>여기가 컴퓨터가 실제로 글자를 &quot;읽는&quot; 단계입니다.</p>

            <p className="ocr-label">🧱 특징 추출 (몽타주 제작)</p>
            <p>
              잘라낸 낱글자 이미지를 픽셀 단위로 뜯어보면서 특징을 뽑습니다.
            </p>
            <ul>
              <li>&quot;위쪽에 긴 가로선 + 가운데 세로선&quot; → T 패턴</li>
              <li>&quot;동그란 테두리 안에 선이 없음&quot; → O 패턴</li>
              <li>획의 위치, 굵기, 교차점을 숫자로 표현해서 특징 벡터 생성</li>
            </ul>

            <p className="ocr-label">📂 학습 데이터 대조 (수배자 명단 조회)</p>
            <p>이 특징 벡터를 거대한 글자 데이터베이스와 비교합니다.</p>
            <ul>
              <li>
                &quot;T&quot;와 98% 비슷, &quot;I&quot;와 2% 비슷 → T로 판단
              </li>
            </ul>
          </section>

          {/* STEP 4 */}
          <section className="ocr-step">
            {/* <div className="ocr-step-header">
              <span className="ocr-step-badge">STEP 4</span>
              <h2>사후 처리 – 배심원단의 최종 검토</h2>
            </div> */}

            <p className="ocr-label">⚖️ 비유</p>
            <p>
              탐정이 &quot;문맥상 이 사람이 맞나?&quot;를 확인하는 단계입니다.
            </p>

            <p className="ocr-label">💻 실제 동작</p>
            <ul>
              <li>사전, 언어 모델 기반으로 문맥상 이상한 글자 조합을 수정</li>
              <li>&quot;H0W&quot; → &quot;HOW&quot; 자동 교정</li>
              <li>
                한국어에서는 이상하게 쪼개진 글자를 다시 합치는 작업도 수행
              </li>
            </ul>
          </section>

          <hr />

          {/* 요약 */}
          <section className="ocr-step ocr-summary">
            <h2>한 줄 정리</h2>
            <ul>
              <li>전처리: 현장 정리</li>
              <li>영역 분리: 글자 덩어리 쪼개기</li>
              <li>특징 추출·인식: 몽타주 만들고 수배자 명단 대조</li>
              <li>사후 처리: 문맥과 사전으로 최종 검토</li>
            </ul>
            <p>
              우리가 구글 렌즈로 휙 찍고 텍스트 복사하는 그 1초 뒤에는, 이런
              탐정놀이가 미친 속도로 돌아가고 있습니다.
            </p>
            <p>
              결국 질문은 하나예요.{" "}
              <strong>“손으로 칠 거냐, 기계를 잘 부려먹을 거냐”</strong>그
              선택이 디지털 노동 탈출의 격차가 됩니다.
            </p>
          </section>

          {onBack && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button className="btn secondary" onClick={onBack}>
                게임으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
