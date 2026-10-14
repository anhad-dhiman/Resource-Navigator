/** Whether to show the JSON developer panel: always in `npm run dev`, or with VITE_SHOW_JSON=true. */
export const SHOW_JSON = import.meta.env.DEV || import.meta.env.VITE_SHOW_JSON === 'true';
