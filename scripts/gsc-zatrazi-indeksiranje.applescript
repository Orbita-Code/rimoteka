-- Zatraži indeksiranje jedne adrese u Google Search Console-u, kroz PRAVI Chrome vlasnice
-- (tamo je prijavljena). Upotreba:  osascript scripts/gsc-zatrazi-indeksiranje.applescript "https://rimoteka.com/rime-za/ljubav/"
-- Preduslov: otvoren bilo koji GSC tab (index ili inspect) za rimoteka.com. Kvota: Google dozvoljava ~10 zahteva dnevno.
-- Ispisuje status („URL is on Google" / „not on Google - razlog") i ishod („Indexing requested" / „Quota exceeded").
-- 06.09.2026. Ne koristiti promenljive kraće od 3 slova (AppleScript se guši na „st").
on run argv
  set U to item 1 of argv
  tell application "Google Chrome"
    repeat with w in windows
      repeat with t in tabs of w
        if (URL of t contains "search-console/inspect") or (URL of t contains "search-console/index") then
          set URL of t to "https://search.google.com/search-console/index?resource_id=sc-domain%3Arimoteka.com"
          delay 8
          execute t javascript "(function(){var i=[...document.querySelectorAll('input')].find(function(e){return /inspect/i.test(e.getAttribute('aria-label')||e.placeholder||'')}); if(!i) return 'nema polja'; i.focus(); i.select(); document.execCommand('insertText',false,'" & U & "'); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})); return 'ok';})()"
          delay 16
          set stanje to execute t javascript "(function(){var t=document.body.innerText; var m=t.match(/URL is (not )?on Google/); var r=t.match(/Page is not indexed: ([^\\n]+)/); return (m?m[0]:'?')+(r?' - '+r[1]:'');})()"
          if stanje contains "not on Google" then
            execute t javascript "(function(){var b=[...document.querySelectorAll('*')].find(function(e){return e.children.length===0 && /^REQUEST INDEXING$/i.test(e.textContent.trim())}); if(!b) return 'nema'; var tgt=b.closest('[role=button], button, div[jsaction], span[jsaction]')||b; tgt.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window})); return 'klik';})()"
            delay 25
            set ishod to execute t javascript "(function(){var t=document.body.innerText; var m=t.match(/(Indexing requested|Quota exceeded|already requested|Something went wrong)[^\\n]*/i); return m?m[0]:'nepoznato';})()"
            return U & " -> " & stanje & " -> " & ishod
          end if
          return U & " -> " & stanje
        end if
      end repeat
    end repeat
  end tell
  return "nema GSC taba"
end run
