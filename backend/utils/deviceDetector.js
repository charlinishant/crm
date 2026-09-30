function parseUserAgent(uaString = "") {
  const ua = String(uaString || "");
  
  let browser = "Unknown Browser";
  let operatingSystem = "Unknown OS";
  let deviceType = "Desktop";

  // Device detection
  if (/mobile/i.test(ua)) {
    deviceType = "Mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = "Tablet";
  } else {
    deviceType = "Desktop";
  }

  // OS detection
  if (/windows nt 10/i.test(ua)) operatingSystem = "Windows 10/11";
  else if (/windows nt/i.test(ua)) operatingSystem = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) operatingSystem = "macOS";
  else if (/android/i.test(ua)) operatingSystem = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = "iOS";
  else if (/linux/i.test(ua)) operatingSystem = "Linux";

  // Browser detection
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Apple Safari";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/trident|msie/i.test(ua)) browser = "Internet Explorer";

  return {
    browser,
    operatingSystem,
    deviceType,
  };
}

module.exports = {
  parseUserAgent,
};
