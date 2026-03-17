; ─────────────────────────────────────────────────────────────────────────────
; Mus-IQ Desktop – Custom NSIS Installer
; Based on real electron-builder template analysis
; ─────────────────────────────────────────────────────────────────────────────

; ─── customHeader ─────────────────────────────────────────────────────────────
; Runs inside installer.nsi BEFORE pages are defined.
; This is the correct place for MUI_* defines and BrandingText override.
!macro customHeader
  ; Override the BrandingText set in common.nsh
  BrandingText "Mus-IQ ${VERSION}  •  Track your music. Know your taste."

  ; Welcome page
  !define MUI_WELCOMEPAGE_TITLE "Willkommen bei Mus-IQ Desktop"
  !define MUI_WELCOMEPAGE_TEXT "Mus-IQ trackt deinen Spotify-Verlauf automatisch im Hintergrund.$\r$\n$\r$\n• Echtzeit Song-Tracking$\r$\n• Detaillierte Hörstatistiken$\r$\n• Discord Rich Presence$\r$\n• Läuft unsichtbar im Systembereich$\r$\n$\r$\nKlicke auf Weiter um die Installation zu starten."

  ; Abort warning
  !define MUI_ABORTWARNING
  !define MUI_ABORTWARNING_TEXT "Möchtest du die Installation wirklich abbrechen?"
!macroend

; ─── customWelcomePage ────────────────────────────────────────────────────────
; Replaces the default welcome page entirely
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ─── customFinishPage ────────────────────────────────────────────────────────
; Replaces the default finish page
!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "Mus-IQ Desktop ist bereit!"
  !define MUI_FINISHPAGE_TEXT "Die Installation war erfolgreich.$\r$\n$\r$\nMelde dich mit deinem mus-iq.com Account an und starte dein Musik-Tracking.$\r$\n$\r$\nDie App läuft automatisch im Hintergrund."
  !define MUI_FINISHPAGE_LINK "mus-iq.com öffnen"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://mus-iq.com"

  !ifndef HIDE_RUN_AFTER_FINISH
    Function StartAppMusIQ
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartAppMusIQ"
    !define MUI_FINISHPAGE_RUN_TEXT "Mus-IQ Desktop jetzt starten"
  !endif

  !insertmacro MUI_PAGE_FINISH
!macroend

; ─── customUnWelcomePage ─────────────────────────────────────────────────────
; Custom uninstall welcome page
!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TITLE "Mus-IQ Desktop deinstallieren"
  !define MUI_UNWELCOMEPAGE_TEXT "Dieser Assistent entfernt Mus-IQ Desktop von deinem Computer.$\r$\n$\r$\nAlle deine Statistiken bleiben auf mus-iq.com erhalten.$\r$\n$\r$\nKlicke auf Weiter um fortzufahren."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

; ─── customInit ──────────────────────────────────────────────────────────────
; Runs in .onInit – detect existing installation and show update dialog
!macro customInit
  ReadRegStr $0 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${If} $0 != ""
    ${If} $0 != "${VERSION}"
      MessageBox MB_OKCANCEL|MB_ICONINFORMATION \
        "Mus-IQ Desktop $0 ist bereits installiert.$\r$\n$\r$\nKlicke OK um auf Version ${VERSION} zu aktualisieren." \
        IDOK musiq_init_ok
      Abort
      musiq_init_ok:
    ${EndIf}
  ${EndIf}
!macroend

; ─── customInstall ───────────────────────────────────────────────────────────
; Runs after files are installed
!macro customInstall
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "URLInfoAbout" "https://mus-iq.com"
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "HelpLink"     "https://mus-iq.com"
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "Comments"     "Track your music. Know your taste."
!macroend

; ─── customUnInstall ─────────────────────────────────────────────────────────
; Runs during uninstall
!macro customUnInstall
  ; Remove autostart entries
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotify Tracker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mus-IQ"

  ; Ask user about keeping their local data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Einstellungen und lokalen Daten behalten?$\r$\n$\r$\nKlicke 'Nein' um alle gespeicherten Daten zu löschen." \
    IDYES musiq_keep_data

  RMDir /r "$APPDATA\MusIQ-Desktop-App"
  RMDir /r "$LOCALAPPDATA\MusIQ-Desktop-App"

  musiq_keep_data:
!macroend
