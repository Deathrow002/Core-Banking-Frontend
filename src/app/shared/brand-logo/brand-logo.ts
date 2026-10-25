import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** Circular bank seal plus the "Core Banking" wordmark. `tone="dark"` is for navy backgrounds. */
@Component({
  selector: 'app-brand-logo',
  template: `
    <svg
      class="seal"
      viewBox="0 0 100 100"
      [attr.width]="size()"
      [attr.height]="size()"
      role="img"
      aria-label="Core Banking seal"
    >
      <defs>
        <path [attr.id]="topArc" d="M 13 50 A 37 37 0 0 1 87 50" />
        <path [attr.id]="bottomArc" d="M 7 50 A 43 43 0 0 0 93 50" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0f3e5b" stroke="#fff" stroke-width="2" />
      <circle cx="50" cy="50" r="33" fill="#144f73" stroke="#fff" stroke-width="1.4" />
      <text class="seal__text" font-size="8.5" letter-spacing="1.4">
        <textPath [attr.href]="'#' + topArc" startOffset="50%" text-anchor="middle">
          CORE BANKING
        </textPath>
      </text>
      <text class="seal__text" font-size="8.5" letter-spacing="3">
        <textPath [attr.href]="'#' + bottomArc" startOffset="50%" text-anchor="middle">
          ADMIN
        </textPath>
      </text>
      <circle cx="9.5" cy="50" r="1.6" fill="#fff" />
      <circle cx="90.5" cy="50" r="1.6" fill="#fff" />
      <g
        transform="translate(32 30) scale(1.5)"
        fill="none"
        stroke="#fff"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 21h18M5 18v-7M9.5 18v-7M14.5 18v-7M19 18v-7M12 3l9 5H3z" />
      </g>
    </svg>
    @if (wordmark()) {
      <span class="wordmark">
        <span class="wordmark__kicker">Console</span>
        <span class="wordmark__name">Core Banking</span>
        <span class="wordmark__tagline">Secure banking operations</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      --kicker: #7a1418;
      --name: #0f3e5b;
      --rule: #0f3e5b;
      --tagline: #3a4a5c;
    }
    :host([tone='dark']) {
      --kicker: #f3b4b7;
      --name: #fff;
      --rule: rgb(255 255 255 / 45%);
      --tagline: #c6d8e5;
    }
    .seal {
      flex: none;
    }
    .seal__text {
      fill: #fff;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: 700;
    }
    .wordmark {
      display: flex;
      flex-direction: column;
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.1;
    }
    .wordmark__kicker {
      color: var(--kicker);
      font-size: 0.8em;
      letter-spacing: 0.42em;
    }
    .wordmark__name {
      padding-bottom: 0.15em;
      border-bottom: 1px solid var(--rule);
      color: var(--name);
      font-size: 1.25em;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .wordmark__tagline {
      margin-top: 0.2em;
      color: var(--tagline);
      font-size: 0.68em;
      font-style: italic;
      text-align: right;
    }
  `,
  host: { '[attr.tone]': 'tone()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogo {
  readonly size = input(48);
  readonly wordmark = input(true);
  readonly tone = input<'light' | 'dark'>('light');

  private readonly uid = nextId++;
  protected readonly topArc = `seal-top-${this.uid}`;
  protected readonly bottomArc = `seal-bottom-${this.uid}`;
}
