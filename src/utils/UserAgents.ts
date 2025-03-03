export const USER_AGENTS = [
  // Windows Browsers
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", // Updated Chrome
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0", // Updated Firefox
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/123.0.0.0 Safari/537.36", // Updated Edge
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OPR/108.0.0.0 Safari/537.36", // Updated Opera
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36", // Older Windows
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", // Windows 11
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36", // Safari on Windows (rare, via emulation)

  // macOS Browsers
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", // Updated macOS Chrome
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3; rv:124.0) Gecko/20100101 Firefox/124.0", // Updated Firefox
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15", // Updated Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) OPR/108.0.0.0 Safari/537.36", // Updated Opera
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Edge/123.0.0.0 Safari/537.36", // Edge on macOS

  // iOS Browsers
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/605.1", // Updated Safari
  "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/605.1", // iPad Safari
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36", // Chrome iOS
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/124.0 Mobile Safari/537.36", // Firefox iOS
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Edge/123.0.0.0 Mobile Safari/537.36", // Edge iOS

  // Android Browsers
  "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36", // Updated Chrome Android
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36", // Pixel Chrome
  "Mozilla/5.0 (Linux; Android 12; OnePlus A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-A535F) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/124.0 Mobile Safari/537.36", // Firefox Android
  "Mozilla/5.0 (Linux; Android 13; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36", // Samsung Internet
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) OPR/108.0.0.0 Mobile Safari/537.36", // Opera Android
  "Mozilla/5.0 (Linux; Android 13; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) UCBrowser/15.5.0.1240 Mobile Safari/537.36", // UC Browser

  // Linux Browsers
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", // Chrome Linux
  "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0", // Firefox Linux
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/109.0", // Older Firefox Ubuntu
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) OPR/108.0.0.0 Safari/537.36", // Opera Linux

  // Other Devices/Platforms
  "Mozilla/5.0 (Windows Phone 10.0; ARM; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Edge/18.0 Mobile Safari/537.36", // Windows Phone Edge
  "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/5.0 Chrome/110.0.0.0 TV Safari/537.36", // Samsung Smart TV
  "Mozilla/5.0 (Linux; Android 12; sdk_gphone_x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36", // Android Emulator
  "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", // Chrome OS
  "Mozilla/5.0 (PlayStation 5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1", // PS5 Browser

  // Privacy-Focused / Alternative Browsers
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Brave/123.0.0.0 Chrome/123.0.0.0 Safari/537.36", // Brave Browser
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Tor/0.4.8.10", // Tor Network
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Vivaldi/6.5.0 Safari/537.36", // Vivaldi Browser
]

export const IP_ADDRESSES = [
  "4.15.128.10", // Example from a range tied to Level 3 Communications (U.S.)
  "23.62.100.25", // Example from Akamai Technologies (U.S. CDN)
  "34.102.136.180", // Example from Google Cloud (U.S. region)
  "50.116.20.75", // Example from Linode (U.S. data center)
  "64.233.160.99", // Example from Google (U.S.)
  "72.14.192.45", // Example from Google (U.S.)
  "104.154.89.123", // Example from Google Cloud (U.S.)
  "162.243.108.200", // Example from DigitalOcean (U.S. data center)
  "173.255.230.15", // Example from Linode (U.S.)
  "198.41.128.50", // Example from Cloudflare (U.S.)
]

export const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
export const Default_UserAgent = USER_AGENTS[0]

export const getRandomUserIP = () => USER_AGENTS[Math.floor(Math.random() * IP_ADDRESSES.length)]
export const Default_UserIP = IP_ADDRESSES[0]

