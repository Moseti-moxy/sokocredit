// Shared PIN policy used by signup, "Change PIN", and "Forgot PIN" so the
// rules can't drift between the three places a user sets a PIN.
export const PIN_PATTERN = /^\d{4,8}$/;
export const UNSAFE_PINS = new Set(['0000', '1111', '1234', '12345', '123456', '1234567', '12345678', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999']);

export function pinError(pin) {
  if (!PIN_PATTERN.test(pin)) return 'PIN must be 4–8 digits.';
  if (UNSAFE_PINS.has(pin)) return 'Choose a less predictable PIN. Common PINs such as 1234 can be reported as compromised by your browser.';
  return '';
}
