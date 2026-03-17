; ─────────────────────────────────────────────────────────────────────────────
; Mus-IQ Desktop – NSIS Customization
; installer/musiq.nsh
; Uses electron-builder's supported customization hooks only.
; ─────────────────────────────────────────────────────────────────────────────

; ─── Branding text at bottom of every installer page ─────────────────────────
BrandingText "${PRODUCT_NAME} ${VERSION}  •  Track your music. Know your taste.  |  mus-iq.com"

; ─── Welcome page text ───────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Willkommen bei Mus-IQ Desktop"
!define MUI_WELCOMEPAGE_TEXT "Mus-IQ trackt deinen Spotify-Verlauf automatisch im Hintergrund.$\r$\n$\r$\n• Echtzeit Song-Tracking$\r$\n• Detaillierte Hörstatistiken$\r$\n• Discord Rich Presence$\r$\n• Läuft unsichtbar im Systembereich$\r$\n$\r$\nKlicke auf Weiter um die Installation zu starten."

; ─── Finish page ─────────────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE "Mus-IQ Desktop ist bereit!"
!define MUI_FINISHPAGE_TEXT "Die Installation war erfolgreich.$\r$\n$\r$\nMelde dich mit deinem mus-iq.com Account an und starte dein Musik-Tracking."
!define MUI_FINISHPAGE_LINK "mus-iq.com öffnen"
!define MUI_FINISHPAGE_LINK_LOCATION "https://mus-iq.com"

; ─── Abort warning ───────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Möchtest du die Installation wirklich abbrechen?"

; ─── customInstall: runs after files are installed ───────────────────────────
; Adds extra registry info for Add/Remove Programs
!macro customInstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "URLInfoAbout" "https://mus-iq.com"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "HelpLink" "https://mus-iq.com"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "Comments" "Track your music. Know your taste."
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "NoModify" 0
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "NoRepair" 0
!macroend

; ─── customUnInstall: runs during uninstall ──────────────────────────────────
; Asks user if they want to keep their data, removes autostart entry
!macro customUnInstall
  ; Remove autostart registry entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotify Tracker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mus-IQ"

  ; Ask about keeping user data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Einstellungen und lokalen Daten behalten?$\r$\n$\r$\nKlicke 'Nein' um alle gespeicherten Daten zu löschen." \
    IDYES musiq_uninstall_keep

  RMDir /r "$APPDATA\MusIQ-Desktop-App"
  RMDir /r "$LOCALAPPDATA\MusIQ-Desktop-App"

  musiq_uninstall_keep:
!macroend

; ─── customInit: detect existing installation ────────────────────────────────
!macro customInit
  ; Check if already installed and show update message
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "DisplayVersion"
  ${If} $0 != ""
    ${If} $0 != "${VERSION}"
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION \
        "Mus-IQ Desktop $0 ist bereits installiert.$\r$\n$\r$\nKlicke OK um auf Version ${VERSION} zu aktualisieren, oder Abbrechen zum Beenden." \
        IDOK musiq_init_continue
      Abort
      musiq_init_continue:
    ${EndIf}
  ${EndIf}
!macroend
