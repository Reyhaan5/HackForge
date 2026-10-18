svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1700 920" width="1700" height="920" style="background:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.08" />
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#2d3748" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#c92a2a" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#1971c2" />
    </marker>
  </defs>

  <!-- ==================== TOP TITLE BAR ==================== -->
  <text x="850" y="50" font-size="28" font-weight="800" text-anchor="middle" fill="#1e1e1e" letter-spacing="1">THE EXPENSE GRAVEYARD BOTTLENECK</text>
  <line x1="560" y1="65" x2="1140" y2="65" stroke="#1e1e1e" stroke-width="2.5" />

  <!-- Top Left Team Oval (Sarva-Conquerors style) -->
  <g transform="translate(60, 20)">
    <ellipse cx="65" cy="30" rx="65" ry="28" fill="#f3f0ff" stroke="#7048e8" stroke-width="2" />
    <text x="65" y="27" font-size="13" font-weight="700" fill="#5f3dc4" text-anchor="middle">Receipt</text>
    <text x="65" y="43" font-size="13" font-weight="700" fill="#5f3dc4" text-anchor="middle">Graveyard</text>
  </g>

  <!-- Top Right Hackathon Badge (Smart India Hackathon style) -->
  <g transform="translate(1420, 20)">
    <rect x="0" y="0" width="210" height="60" rx="10" fill="#ebfbee" stroke="#087f5b" stroke-width="2" />
    <text x="105" y="26" font-size="13" font-weight="800" fill="#2b8a3e" text-anchor="middle">HF'26 HACKATHON</text>
    <text x="105" y="45" font-size="12" font-weight="600" fill="#2b8a3e" text-anchor="middle">NMIMS MPSTME</text>
  </g>

  <!-- ==================== 1. LEFT INPUT CIRCLE ==================== -->
  <g transform="translate(60, 320)">
    <circle cx="125" cy="125" r="125" fill="#fff4e6" stroke="#e67700" stroke-width="3" filter="url(#shadow)" />
    <text x="125" y="-12" font-size="18" font-weight="800" fill="#d9480f" text-anchor="middle" letter-spacing="1">INPUT</text>
    <text x="125" y="278" font-size="14" font-weight="700" fill="#d9480f" text-anchor="middle">Input Channels</text>

    <!-- Inside Chits -->
    <g transform="translate(25, 28)">
      <rect x="0" y="0" width="200" height="42" rx="8" fill="#ffffff" stroke="#ced4da" stroke-width="1.5" />
      <text x="100" y="26" font-size="12" font-weight="600" fill="#343a40" text-anchor="middle">📱 Mobile Photos (Angles / Blur)</text>
    </g>

    <g transform="translate(25, 85)">
      <rect x="0" y="0" width="200" height="42" rx="8" fill="#ffffff" stroke="#ced4da" stroke-width="1.5" />
      <text x="100" y="26" font-size="12" font-weight="600" fill="#343a40" text-anchor="middle">🧾 Wrinkled Thermal Slips</text>
    </g>

    <g transform="translate(25, 142)">
      <rect x="0" y="0" width="200" height="48" rx="8" fill="#ffffff" stroke="#ced4da" stroke-width="1.5" />
      <text x="100" y="22" font-size="12" font-weight="600" fill="#343a40" text-anchor="middle">📧 Email PDFs &amp; S3 Vaults</text>
      <text x="100" y="38" font-size="11" font-weight="500" fill="#868e96" text-anchor="middle">(Desktop Auto-Sync Folders)</text>
    </g>
  </g>

  <!-- ARROW: INPUT TO DIAMOND -->
  <path d="M 315 445 L 390 445" fill="none" stroke="#2d3748" stroke-width="2.5" marker-end="url(#arrow)" />

  <!-- ==================== 2. ROUTER DIAMOND ==================== -->
  <g transform="translate(395, 365)">
    <polygon points="80,0 160,80 80,160 0,80" fill="#e7f5ff" stroke="#1971c2" stroke-width="2.5" filter="url(#shadow)" />
    <text x="80" y="65" font-size="14" font-weight="700" fill="#1864ab" text-anchor="middle">Multi-Channel</text>
    <text x="80" y="83" font-size="14" font-weight="700" fill="#1864ab" text-anchor="middle">Expense</text>
    <text x="80" y="101" font-size="14" font-weight="700" fill="#1864ab" text-anchor="middle">Intake</text>
  </g>

  <!-- ==================== TOP BRANCH (UPWARDS) ==================== -->
  <path d="M 475 365 L 475 270" fill="none" stroke="#c2255c" stroke-width="2.5" marker-end="url(#arrow-red)" />
  <text x="485" y="325" font-size="11" font-weight="700" fill="#c2255c">Policy Branch</text>

  <!-- Top Box: Strict Policy Blindness (Upper Encoder) -->
  <g transform="translate(385, 135)">
    <rect x="0" y="0" width="180" height="125" rx="10" fill="#f8f0fc" stroke="#9c36b5" stroke-width="2" filter="url(#shadow)" />
    <line x1="0" y1="70" x2="180" y2="70" stroke="#9c36b5" stroke-width="1.5" />
    <text x="90" y="28" font-size="13" font-weight="700" fill="#862e9c" text-anchor="middle">Strict Rule Blindness</text>
    <text x="90" y="48" font-size="11" font-weight="500" fill="#495057" text-anchor="middle">No Itemized Nuance</text>
    <text x="90" y="98" font-size="14" font-weight="800" fill="#e03131" text-anchor="middle">Auto-Reject Entire Bill</text>
    <text x="90" y="-8" font-size="11" font-style="italic" fill="#862e9c" text-anchor="middle">All-or-Nothing Rule</text>
  </g>

  <!-- Curve from Top Box to Fusion -->
  <path d="M 565 197 Q 640 197 640 400 L 690 400" fill="none" stroke="#718096" stroke-width="2" marker-end="url(#arrow)" />
  <text x="580" y="185" font-size="11" fill="#718096">Legitimate claims rejected</text>

  <!-- ==================== BOTTOM BRANCH (DOWNWARDS) ==================== -->
  <path d="M 475 525 L 475 620" fill="none" stroke="#0c8599" stroke-width="2.5" marker-end="url(#arrow-blue)" />
  <text x="485" y="580" font-size="11" font-weight="700" fill="#0c8599">Fraud Branch</text>

  <!-- Bottom Box: Cross-Claim Blindspot (Lower Encoder) -->
  <g transform="translate(385, 630)">
    <rect x="0" y="0" width="180" height="125" rx="10" fill="#f8f0fc" stroke="#9c36b5" stroke-width="2" filter="url(#shadow)" />
    <line x1="0" y1="70" x2="180" y2="70" stroke="#9c36b5" stroke-width="1.5" />
    <text x="90" y="28" font-size="13" font-weight="700" fill="#862e9c" text-anchor="middle">Cross-Claim Blindspot</text>
    <text x="90" y="48" font-size="11" font-weight="500" fill="#495057" text-anchor="middle">Structuring Under Cap</text>
    <text x="90" y="98" font-size="14" font-weight="800" fill="#e03131" text-anchor="middle">Invisible Collusion</text>
    <text x="90" y="142" font-size="11" font-style="italic" fill="#862e9c" text-anchor="middle">Zero Cross-Audit</text>
  </g>

  <!-- Curve from Bottom Box to Fusion -->
  <path d="M 565 692 Q 640 692 640 490 L 690 490" fill="none" stroke="#718096" stroke-width="2" marker-end="url(#arrow)" />
  <text x="580" y="710" font-size="11" fill="#718096">Duplicate claims slip by</text>

  <!-- ==================== 3. CENTER: THE EXPENSE GRAVEYARD ==================== -->
  <g transform="translate(700, 345)">
    <rect x="0" y="0" width="165" height="200" rx="12" fill="#e3fafc" stroke="#0c8599" stroke-dasharray="6,4" stroke-width="2.5" filter="url(#shadow)" />
    <text x="82" y="34" font-size="16" font-weight="800" fill="#0b7285" text-anchor="middle">The Expense</text>
    <text x="82" y="56" font-size="16" font-weight="800" fill="#0b7285" text-anchor="middle">Graveyard</text>
    <line x1="25" y1="70" x2="140" y2="70" stroke="#0c8599" stroke-width="1" />
    <text x="82" y="105" font-size="28" font-weight="700" fill="#c92a2a" text-anchor="middle">↓</text>
    <text x="82" y="140" font-size="14" font-weight="700" fill="#d9480f" text-anchor="middle">Backlog Pile</text>
    <text x="82" y="162" font-size="13" font-weight="600" fill="#d9480f" text-anchor="middle">&amp; Orphaned Chits</text>
  </g>

  <!-- ARROW: GRAVEYARD TO HUMAN AUDITOR -->
  <path d="M 870 445 L 945 445" fill="none" stroke="#2d3748" stroke-width="2.5" marker-end="url(#arrow)" />
  <text x="880" y="432" font-size="11" font-weight="600" fill="#495057">Unresolved</text>

  <!-- ==================== 4. MANUAL AUDITOR (CHOKEPOINT) ==================== -->
  <g transform="translate(950, 375)">
    <rect x="0" y="0" width="180" height="140" rx="10" fill="#f8f0fc" stroke="#9c36b5" stroke-width="2.5" filter="url(#shadow)" />
    <line x1="0" y1="68" x2="180" y2="68" stroke="#9c36b5" stroke-width="1.5" />
    <text x="90" y="28" font-size="14" font-weight="800" fill="#5f3dc4" text-anchor="middle">Manual Auditor</text>
    <text x="90" y="48" font-size="12" font-weight="700" fill="#862e9c" text-anchor="middle">(Human Chokepoint)</text>
    <text x="90" y="93" font-size="12" font-weight="500" fill="#495057" text-anchor="middle">Line-by-line verification</text>
    <text x="90" y="112" font-size="12" font-weight="500" fill="#495057" text-anchor="middle">&amp; mental currency math</text>
    <text x="90" y="162" font-size="11" font-style="italic" fill="#9c36b5" text-anchor="middle">Severe Reviewer Fatigue</text>
  </g>

  <!-- ARROW UP TO FAILURE MODES -->
  <path d="M 1070 375 Q 1070 240 1175 240" fill="none" stroke="#2d3748" stroke-width="2" marker-end="url(#arrow)" />

  <!-- ==================== 5. FAILURE MODES (LOSS FUNCTIONS STYLE) ==================== -->
  <g transform="translate(1185, 150)">
    <rect x="0" y="0" width="235" height="150" rx="10" fill="#fff5f5" stroke="#c92a2a" stroke-width="2.5" filter="url(#shadow)" />
    <line x1="0" y1="38" x2="235" y2="38" stroke="#c92a2a" stroke-width="1.5" />
    <text x="117" y="26" font-size="14" font-weight="800" fill="#c92a2a" text-anchor="middle">Audit Failure Modes</text>
    <text x="16" y="62" font-size="11" font-weight="600" fill="#495057">• False Rejection (beer kills ₹5k bill)</text>
    <text x="16" y="84" font-size="11" font-weight="600" fill="#495057">• Double Claims slip by unnoticed</text>
    <text x="16" y="106" font-size="11" font-weight="600" fill="#495057">• Threshold Smurfing under ₹16.7k</text>
    <text x="16" y="128" font-size="11" font-weight="600" fill="#495057">• 3-5 days reimbursement cycle lag</text>
  </g>

  <!-- REVIEWER FATIGUE (GAN STYLE) -->
  <g transform="translate(1185, 405)">
    <rect x="0" y="0" width="235" height="80" rx="8" fill="#ffffff" stroke="#c92a2a" stroke-width="2" filter="url(#shadow)" />
    <text x="117" y="32" font-size="13" font-weight="800" fill="#c92a2a" text-anchor="middle">Reviewer Fatigue</text>
    <text x="117" y="54" font-size="12" font-weight="600" fill="#e03131" text-anchor="middle">(Rubber-Stamping Bad Claims)</text>
  </g>

  <!-- ARROW FROM FAILURE BOX TO FATIGUE -->
  <path d="M 1302 300 L 1302 395" fill="none" stroke="#c92a2a" stroke-width="2" marker-end="url(#arrow-red)" />

  <!-- LOOP BACK TO AUDITOR -->
  <path d="M 1185 455 L 1140 455" fill="none" stroke="#c92a2a" stroke-width="2" marker-end="url(#arrow-red)" />

  <!-- ARROW TO FINAL OUTPUT -->
  <path d="M 1420 445 L 1465 445" fill="none" stroke="#2d3748" stroke-width="2.5" marker-end="url(#arrow)" />

  <!-- ==================== 6. RIGHT OUTPUT CIRCLE ==================== -->
  <g transform="translate(1470, 320)">
    <circle cx="125" cy="125" r="125" fill="#fff4e6" stroke="#e67700" stroke-width="3" filter="url(#shadow)" />
    <text x="125" y="-12" font-size="18" font-weight="800" fill="#d9480f" text-anchor="middle" letter-spacing="1">OUTPUT</text>

    <text x="125" y="75" font-size="18" font-weight="800" fill="#c92a2a" text-anchor="middle">5 - 8% Spend</text>
    <text x="125" y="98" font-size="18" font-weight="800" fill="#c92a2a" text-anchor="middle">Leakage</text>

    <line x1="45" y1="118" x2="205" y2="118" stroke="#f76707" stroke-width="1.5" />

    <text x="125" y="145" font-size="15" font-weight="700" fill="#495057" text-anchor="middle">3 - 5 Day Delay</text>
    <text x="125" y="170" font-size="14" font-weight="700" fill="#c92a2a" text-anchor="middle">Audit Compliance Risk</text>

    <text x="125" y="278" font-size="16" font-weight="800" fill="#d9480f" text-anchor="middle" letter-spacing="1">BUSINESS IMPACT</text>
  </g>

  <!-- ==================== 7. BOTTOM BANNER & EVALUATION ==================== -->
  <g transform="translate(1420, 680)">
    <rect x="0" y="0" width="240" height="70" rx="8" fill="#e7f5ff" stroke="#1971c2" stroke-width="2" />
    <text x="120" y="28" font-size="12" font-weight="700" fill="#1864ab" text-anchor="middle">Hidden Exposure</text>
    <text x="120" y="48" font-size="11" font-weight="500" fill="#495057" text-anchor="middle">(Tax Penalties, GST Audit, Morale)</text>
    <text x="120" y="88" font-size="11" font-weight="600" fill="#868e96" text-anchor="middle">Testing &amp; Audit Phase</text>
  </g>
  <path d="M 1540 575 L 1540 670" fill="none" stroke="#2d3748" stroke-width="2" marker-end="url(#arrow)" />

  <!-- BOTTOM CYCLE LABEL -->
  <g transform="translate(730, 680)">
    <line x1="0" y1="0" x2="420" y2="0" stroke="#868e96" stroke-width="1.5" />
    <text x="210" y="24" font-size="16" font-weight="700" fill="#343a40" text-anchor="middle">❖  The Traditional Expense Breakdown Cycle</text>
    <line x1="0" y1="36" x2="420" y2="36" stroke="#868e96" stroke-width="1.5" />
  </g>
</svg>
"""

with open(r"c:\Users\Admin\Downloads\Diploma (I.T.)\HackForge\slide2_problem_diagram.svg", "w", encoding="utf-8") as f:
    f.write(svg_content.strip())

print("SVG created successfully with spacious 1700x920 layout!")
