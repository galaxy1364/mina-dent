import * as React from "react";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #333",
        background: "#111",
        color: "#fff",
        cursor: "pointer",
        ...props.style
      }}
    />
  );
}
