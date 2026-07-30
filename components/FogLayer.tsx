import type { CSSProperties } from "react";

interface FogCloud {
  w: number;
  h: number;
  l: string;
  b: string;
  fd: string;
  fdelay: string;
  fx: string;
  fo: string;
}

const clouds: FogCloud[] = [
  { w: 600, h: 170, l: "-10%", b: "0", fd: "22s", fdelay: "0s", fx: "50px", fo: "0.4" },
  { w: 500, h: 140, l: "20%", b: "8px", fd: "26s", fdelay: "-8s", fx: "-40px", fo: "0.32" },
  { w: 700, h: 190, l: "50%", b: "0", fd: "19s", fdelay: "-5s", fx: "60px", fo: "0.42" },
];

export default function FogLayer() {
  return (
    <div className="fog-layer" id="fogLayer">
      {clouds.map((c, i) => (
        <div
          key={i}
          className="fog-cloud"
          style={
            {
              width: `${c.w}px`,
              height: `${c.h}px`,
              left: c.l,
              bottom: c.b,
              "--fd": c.fd,
              "--fdelay": c.fdelay,
              "--fx": c.fx,
              "--fo": c.fo,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
