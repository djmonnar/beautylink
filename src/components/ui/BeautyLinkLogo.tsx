import React from "react";

type BeautyLinkLogoProps = {
  variant?: "horizontal" | "icon" | "wordmark";
  className?: string;
};

export default function BeautyLinkLogo({ variant = "horizontal", className = "" }: BeautyLinkLogoProps) {
  const navy = "#1E2A4A";
  const blue = "#2563EB";
  const lightBlue = "#60A5FA";
  const bgBlue = "#EFF6FF";

  const Icon = () => (
    <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="116" fill={bgBlue}/>
      <rect x="78" y="78" width="356" height="356" rx="92" fill="white"/>
      <g transform="translate(68 80)">
        <path d="M147 127 C118 98 118 51 147 22 C176 -7 224 -7 253 22 L282 51 C293 62 293 80 282 91 C271 102 253 102 242 91 L213 62 C202 51 184 51 173 62 C162 73 162 91 173 102 L224 153 C235 164 235 182 224 193 C213 204 195 204 184 193 L147 156 C139 148 136 138 147 127Z" fill={navy}/>
        <path d="M240 199 C269 228 269 275 240 304 C211 333 163 333 134 304 L105 275 C94 264 94 246 105 235 C116 224 134 224 145 235 L174 264 C185 275 203 275 214 264 C225 253 225 235 214 224 L163 173 C152 162 152 144 163 133 C174 122 192 122 203 133 L240 170 C248 178 251 188 240 199Z" fill={blue}/>
        <path d="M177 140 C188 129 206 129 217 140 L250 173 C261 184 261 202 250 213 C239 224 221 224 210 213 L177 180 C166 169 166 151 177 140Z" fill={lightBlue}/>
        <path d="M307 42 L317 70 L345 80 L317 90 L307 118 L297 90 L269 80 L297 70 L307 42Z" fill={blue}/>
        <path d="M336 121 L342 137 L358 143 L342 149 L336 165 L330 149 L314 143 L330 137 L336 121Z" fill={lightBlue}/>
      </g>
    </svg>
  );

  if (variant === "icon") return <div className={className}><Icon /></div>;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon />
      {(variant === "horizontal" || variant === "wordmark") && (
        <span className="font-extrabold tracking-[-0.04em] text-[#1E2A4A] text-xl">
          뷰티링크
        </span>
      )}
    </div>
  );
}
