; ─────────────────────────────────────────────────────────────────────────────
; Mus-IQ Desktop – Custom NSIS Include Script
; File: installer/musiq.nsh
; NOTE: This is an !include file, not a full NSIS script.
; electron-builder already defines MUI_ICON, MUI pages, etc.
; We only add custom macros and strings here.
; ─────────────────────────────────────────────────────────────────────────────

; ─── Branding text (shown at bottom of installer) ────────────────────────────
BrandingText "Mus-IQ • Track your music. Know your taste.  |  mus-iq.com"

; ─── Welcome page text ───────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Willkommen bei Mus-IQ Desktop"
!define MUI_WELCOMEPAGE_TEXT "Dieses Setup installiert Mus-IQ Desktop auf deinem Computer.$\r$\n$\r$\nMus-IQ trackt deinen Spotify-Verlauf automatisch im Hintergrund – damit du immer weißt, was du hörst.$\r$\n$\r$\nKlicke auf Weiter, um fortzufahren."

; ─── Finish page ─────────────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE "Installation abgeschlossen!"
!define MUI_FINISHPAGE_TEXT "Mus-IQ Desktop wurde erfolgreich installiert.$\r$\n$\r$\nDie App läuft unauffällig im Hintergrund und trackt deinen Spotify-Verlauf automatisch.$\r$\n$\r$\nViel Spaß mit Mus-IQ!"
!define MUI_FINISHPAGE_LINK "mus-iq.com besuchen"
!define MUI_FINISHPAGE_LINK_LOCATION "https://mus-iq.com"

; ─── Uninstall: ask about keeping data ───────────────────────────────────────
!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Einstellungen und lokalen Daten behalten?$\r$\n$\r$\nKlicke 'Nein' um alle App-Daten zu löschen." \
    IDYES musiq_keep_data

  RMDir /r "$APPDATA\MusIQ-Desktop-App"
  RMDir /r "$LOCALAPPDATA\MusIQ-Desktop-App"

  musiq_keep_data:
  
  ; Remove autostart registry entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotify Tracker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mus-IQ"
!macroend

; ─── After install: set registry info for Add/Remove Programs ────────────────
!macro customInstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "URLInfoAbout" "https://mus-iq.com"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "HelpLink" "https://mus-iq.com"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "Publisher" "Mus-IQ"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "Comments" "Track your music. Know your taste."
!macroend
