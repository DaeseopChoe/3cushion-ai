import { useEffect, useState } from "react";

export default function MobileWrapper({ children }) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#0f172a",

        /* 🔒 화면 자체를 고정 */
        width: "100vw",
        height: "100vh",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          /* ✅ 세로일 때: 화면을 강제로 가로로 돌림 */
          width: isPortrait ? "100vh" : "100vw",
          height: isPortrait ? "100vw" : "100vh",

          transform: isPortrait ? "rotate(90deg)" : "none",
          transformOrigin: "center center",

          /* 당구대는 항상 2:1 가로 기준 */
          aspectRatio: "2 / 1",

          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
