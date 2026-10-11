export function MarketIllustration() {
  return (
    <div className="market-art">
      <div className="art-caption">
        <span className="eyebrow">A WORLD OF FINDS</span>
        <p>
          One neighbourhood.
          <br />
          Endless possibilities.
        </p>
      </div>
      <svg
        viewBox="0 0 520 380"
        role="img"
        aria-label="Illustration of colourful market storefronts, not a geographic map"
      >
        <circle cx="413" cy="63" r="35" fill="#f1b760" />
        <path d="M0 330H520" stroke="#bea78c" />
        <path d="M48 314V104L146 67L235 104V314Z" fill="#c76f4d" />
        <path d="M146 67V314H235V104Z" fill="#a9573e" />
        <path
          d="M32 105L146 60L249 105"
          fill="none"
          stroke="#564a3e"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path d="M221 314V154L338 112L450 154V314Z" fill="#eed6ad" />
        <path d="M338 112V314H450V154Z" fill="#d7b994" />
        <path
          d="M209 155L338 106L462 155"
          fill="none"
          stroke="#564a3e"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path d="M59 188H222V213H59Z" fill="#f7dfb8" />
        <path d="M59 188H222L209 164H71Z" fill="#f7dfb8" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${71 + i * 30} 164h15l5 24v25h-20v-25z`}
            fill="#355f54"
          />
        ))}
        <path d="M72 223H132V314H72Z" fill="#4c4d3f" />
        <path d="M146 223H209V296H146Z" fill="#f4bc76" />
        <path d="M153 231H201V288H153Z" fill="#354e48" />
        <path d="M85 122H125V153H85ZM157 114H196V145H157Z" fill="#f4ca92" />
        <path d="M104 122V153M176 114V145" stroke="#855238" strokeWidth="4" />
        <path d="M241 211H441L423 185H257Z" fill="#e18f51" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M${253 + i * 30} 190h14l7 21v13h-23v-13z`}
            fill="#f5e2ba"
          />
        ))}
        <path d="M255 236H302V314H255ZM326 236H427V296H326Z" fill="#3d6357" />
        <path d="M267 149H303V174H267ZM364 154H404V179H364Z" fill="#648479" />
        <path
          d="M40 294Q17 259 28 246Q56 252 48 284Q61 259 77 265Q80 285 48 296Z"
          fill="#587960"
        />
        <path d="M30 297H66L59 324H37Z" fill="#b76647" />
        <ellipse cx="174" cy="334" rx="27" ry="5" fill="#d2bfa4" />
        <circle cx="174" cy="255" r="10" fill="#795744" />
        <path d="M160 271Q174 261 188 271L184 309H164Z" fill="#e9b852" />
        <path
          d="M167 309L164 333M181 309L185 333"
          stroke="#3f4944"
          strokeWidth="7"
        />
        <path
          d="M161 276L151 299M187 276L197 293"
          stroke="#795744"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse cx="373" cy="342" rx="26" ry="5" fill="#d2bfa4" />
        <circle cx="373" cy="271" r="9" fill="#795744" />
        <path d="M359 285Q373 278 387 285L385 319H361Z" fill="#f2e1bc" />
        <path
          d="M367 318L365 341M380 318L384 341"
          stroke="#35564c"
          strokeWidth="7"
        />
        <path
          d="M360 289L351 315M386 289L396 311"
          stroke="#795744"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M393 308H409L411 329H392Z" fill="#c77d4e" />
        <path
          d="M24 138Q82 174 133 159T229 165T339 154T481 183"
          fill="none"
          stroke="#74664e"
          strokeWidth="2"
        />
        {[44, 85, 126, 167, 208, 249, 290, 331, 372, 413, 454].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${i < 3 ? 151 : 162}l12 3-7 16z`}
            fill={i % 2 ? "#e7b261" : "#547a69"}
          />
        ))}
      </svg>
      <span className="art-note">
        Inspired by the spirit of Pettah · Illustration
      </span>
    </div>
  );
}
