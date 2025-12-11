// src/EventPrizeBoard.js
import React from "react";

const PRIZES = [
  {
    rank: "🥇 1등",
    title: "올인원 캐릭터 양말세트",
    img: "https://nongshimmall.com/web/product/big/202509/e0d6340eebdb5bbdcc751fa93ad2dbcb.jpg",
    desc: "귀엽고 편한 양말로 일상까지 맛있게",
  },
  {
    rank: "🥈 2등",
    title: "웰치스〈주토피아2〉무비세트",
    img: "https://nongshimmall.com/web/product/big/202511/78246437679a1061762c1ac0432bc953.jpg",
    desc: "주토피아2 캐릭터들을 웰치스로",
  },
  {
    rank: "🥉 3등",
    title: "빵부장 키링세트_4입",
    img: "https://nongshimmall.com/web/product/big/202510/1bef4a171aaf451f5b319a94cc26c49a.jpg",
    desc: "키링으로 만나빵",
  },
  {
    rank: "4~10등",
    title: "스타벅스 아메리카노 1잔",
    img: "https://cdn.011st.com/11dims/resize/1000x1000/quality/75/11src/product/1003065387/B.jpg?597000000",
    desc: "아쉽지만 따뜻한 커피라도 한 잔",
  },
  {
    rank: "참여 추첨",
    title: "스타벅스 아메리카노 1잔 (추첨 10명)",
    img: "https://cdn.011st.com/11dims/resize/1000x1000/quality/75/11src/product/1003065387/B.jpg?597000000",
    desc: "도전만 해도 행운의 기회!",
  },
];

export default function EventPrizeBoard({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9001,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.37)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          minWidth: 370,
          maxWidth: 460,
          maxHeight: 580,
          borderRadius: 22,
          boxShadow: "0 10px 40px #1117",
          padding: "34px 26px 28px",
          position: "relative",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: 16,
            top: 10,
            background: "none",
            border: "none",
            fontSize: 25,
            color: "#7cb1be",
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <h2
          style={{
            textAlign: "center",
            marginBottom: 12,
            fontWeight: 800,
            fontSize: 23,
            letterSpacing: ".03em",
            color: "#1e7cb9",
          }}
        >
          🎁 <span style={{ color: "#ff8448" }}>이벤트 상품</span> 안내
        </h2>
        <div
          style={{
            fontSize: 15,
            color: "#555",
            textAlign: "center",
            marginBottom: 18,
          }}
        >
          이벤트 랭킹에 따라
          <br />
          아래와 같은 선물을 드려요!
        </div>
        {PRIZES.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              margin: "22px 0",
              padding: "16px 7px 16px 9px",
              background: i < 3 ? "#fafdff" : "#fff",
              borderRadius: 14,
              boxShadow: i < 3 ? "0 2px 15px #aed3ff1b" : "none",
              border: i < 3 ? "1.6px solid #bbdaf9" : "1px solid #e8f0ff",
            }}
          >
            <img
              src={item.img}
              alt={item.title}
              style={{
                width: 76,
                height: 76,
                objectFit: "cover",
                borderRadius: 12,
                border: "2.3px solid #f5f9ff",
                boxShadow: "0 2px 8px #bde1fd38",
                background: "#f5f8fa",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#2266d7",
                  marginBottom: 1,
                  letterSpacing: ".02em",
                }}
              >
                {item.rank}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#333" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: "#477", marginTop: 3 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
        <div
          style={{
            margin: "17px 0 0",
            color: "#999",
            textAlign: "left",
            fontSize: 13.5,
          }}
        >
          <br />※ 이벤트 상품은 변경될 수 있습니다.
        </div>
      </div>
    </div>
  );
}
