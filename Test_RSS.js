(function() {
  /**
   * Sanitizes a string for XML by removing invalid characters and escaping special chars.
   * Allowed chars: 
   *  - #x9, #xA, #xD
   *  - [#x20-#xD7FF]
   *  - [#xE000-#xFFFD]
   * Characters outside these ranges are removed.
   */
  function sanitizeForXmlChars(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const code = ch.charCodeAt(0);
      const allowed = 
        code === 0x09 ||
        code === 0x0A ||
        code === 0x0D ||
        (code >= 0x20 && code <= 0xD7FF) ||
        (code >= 0xE000 && code <= 0xFFFD);

      if (!allowed) {
        // Skip disallowed character
        continue;
      }

      // Escape special characters
      switch (ch) {
        case '<': result += '&lt;'; break;
        case '>': result += '&gt;'; break;
        case '&': result += '&amp;'; break;
        case '"': result += '&quot;'; break;
        case "'": result += '&apos;'; break;
        default:  result += ch;
      }
    }
    return result;
  }

  function sanitizeForXml(str) {
    return sanitizeForXmlChars(str || '');
  }

  function formatRFC822(d) {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dayName = days[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2,'0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2,'0');
    const min = String(d.getMinutes()).padStart(2,'0');
    const sec = String(d.getSeconds()).padStart(2,'0');
    return `${dayName}, ${dayNum} ${monthName} ${year} ${hour}:${min}:${sec} +0100`;
  }

  // Mapping for month abbreviations if needed
  const monthsMap = {
    jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", maj: "May",
    jun: "Jun", jul: "Jul", aug: "Aug", sep: "Sep", okt: "Oct",
    nov: "Nov", dec: "Dec"
  };

  /**
   * This function runs after the events are on the page. 
   * It:
   *  1. Finds event elements
   *  2. Extracts their data
   *  3. Constructs an RSS feed
   *  4. Logs it and provides a download link
   */
  window.generateEventsRSS = function() {
    const eventLinks = document.querySelectorAll('a.hiq-events-list__search-results--hits__hit--link');
    const events = [];

    eventLinks.forEach(link => {
      const titleEl = link.querySelector('.hiq-events-list__search-results--hits__hit--header');
      const dateEl = link.querySelector('.hiq-events-list__search-results--hits__hit--short-date');
      const timeEl = link.querySelector('.hiq-events-list__search-results--hits__hit--info__date');
      const locationEl = link.querySelector('.hiq-events-list__search-results--hits__hit--info__location');
      const imgEl = link.querySelector('img');

      const rawTitle = titleEl ? titleEl.textContent.trim() : "No Title";
      const rawDateStr = dateEl ? dateEl.textContent.trim() : "";
      const rawTimeStr = timeEl ? timeEl.textContent.trim() : "";
      const rawLocation = locationEl ? locationEl.textContent.trim() : "";
      const rawImgUrl = imgEl ? imgEl.src : "";

      const eventYear = 2024; // Adjust year if needed
      let eventDate = new Date();
      if (rawDateStr && rawTimeStr) {
        const [dayStr, shortMonth] = rawDateStr.split(' ');
        const monthEng = monthsMap[shortMonth?.toLowerCase()] || "Dec";
        const monthIndex = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(monthEng);
        const [hour, minute] = rawTimeStr.split('.');
        if (monthIndex >= 0 && !isNaN(dayStr) && !isNaN(hour) && !isNaN(minute)) {
          eventDate = new Date(eventYear, monthIndex, parseInt(dayStr), parseInt(hour), parseInt(minute));
        }
      }

      const pubDate = formatRFC822(eventDate);
      const fullLink = new URL(link.href, window.location.origin).href;
      const displayTitle = `${rawDateStr}, ${rawTitle}`;

      let imgType = 'image/webp';
      if (rawImgUrl.endsWith('.jpg') || rawImgUrl.endsWith('.jpeg')) {
        imgType = 'image/jpeg';
      }

      events.push({
        title: displayTitle,
        link: fullLink,
        description: rawLocation,
        pubDate: pubDate,
        guid: fullLink,
        image_url: rawImgUrl,
        image_type: imgType,
        image_length: '12345'
      });
    });

    let rss = `<rss version="2.0">
<channel>
<title>${sanitizeForXml('visiteskilstuna.se - KOMMANDE EVENEMANG')}</title>
<link>${sanitizeForXml('https://visiteskilstuna.se/')}</link>
<description>${sanitizeForXml('Ett rss-flöde som visar KOMMANDE EVENEMANG')}</description>
<language>sv</language>
<generator>Sitevision</generator>
`;

    events.forEach(e => {
      const encTitle = sanitizeForXml(e.title);
      const encDescription = sanitizeForXml(e.description);
      const encLink = sanitizeForXml(e.link);
      const encGuid = sanitizeForXml(e.guid);
      const encImgUrl = sanitizeForXml(e.image_url);
      const encImgType = sanitizeForXml(e.image_type);

      rss += `<item>
<pubDate>${e.pubDate}</pubDate>
<enclosure url="${encImgUrl}" length="${e.image_length}" type="${encImgType}"/>
<title>${encTitle}</title>
<description>${encDescription}</description>
<link>${encLink}</link>
<guid>${encGuid}</guid>
</item>
`;
    });

    rss += `</channel>
</rss>`;

    console.log(rss);

    // Create a download link
    const blob = new Blob([rss], {type: 'application/rss+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "events_feed.xml";
    a.textContent = "Download RSS Feed";
    document.body.appendChild(a);
  };
})();
