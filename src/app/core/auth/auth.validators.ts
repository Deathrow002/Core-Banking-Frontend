import { Validators } from '@angular/forms';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors UserRegisPayload.PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH on the backend. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Length rules shared by every password field; add Validators.required where a password is mandatory. */
export const PASSWORD_LENGTH_RULES = [
  Validators.minLength(PASSWORD_MIN_LENGTH),
  Validators.maxLength(PASSWORD_MAX_LENGTH),
];
