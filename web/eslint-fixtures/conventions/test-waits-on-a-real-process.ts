// eslint-disable-next-line no-restricted-syntax -- the lockout is the identity provider's own window, which no fake clock moves
export const pause = () => new Promise((resolve) => setTimeout(resolve, 450));
