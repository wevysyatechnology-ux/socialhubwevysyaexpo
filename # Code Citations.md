# Code Citations

## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```


## License: unknown
https://github.com/rbmitsolutions/texas-dashboard-14/blob/d460669e8e46bb8398ea7abcd6eb377975654625/src/common/libs/pdf-lib/contract.ts

```
Teeno files ka current exact code haath aa gaya. Ab precise before/after code ke saath Lovable prompt ready karta hoon:

---

Yeh exact prompt Lovable me paste karo:

---

Fix mobile flyer download — logo missing and blob URL crash.

There are 3 files to change. Each change is described with exact current code (BEFORE) and exact replacement code (AFTER).

---

**FILE 1: `src/lib/capacitor-utils.ts`**

Find this exact function:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
```

Replace with:

```ts
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Expo WebView: FileSystem.downloadAsync rejects blob: URLs (only accepts http/https).
  // Convert to base64 data URL first so the native DOWNLOAD handler can write it directly.
  if (isExpoWebView()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as any).ReactNativeWeb
```

