; ─────────────────────────────────────────────────────────────────────────────
; Mus-IQ Desktop – Custom NSIS Installer Script
; Place this file at: installer/musiq.nsh
; Then reference it in package.json build.nsis.script
; ─────────────────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"

; ─── Branding ─────────────────────────────────────────────────────────────────
Name "Mus-IQ Desktop"
BrandingText "Mus-IQ • Track your music. Know your taste."
Caption "Mus-IQ Desktop Setup"

; ─── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Header image (150x57px BMP)
; !define MUI_HEADERIMAGE
; !define MUI_HEADERIMAGE_BITMAP "assets\installer-header.bmp"
; !define MUI_HEADERIMAGE_RIGHT

; Welcome/Finish page image (164x314px BMP)
; !define MUI_WELCOMEFINISHPAGE_BITMAP "assets\installer-sidebar.bmp"

; Welcome page
!define MUI_WELCOMEPAGE_TITLE "Willkommen bei Mus-IQ Desktop"
!define MUI_WELCOMEPAGE_TEXT "Dieses Setup installiert Mus-IQ Desktop auf deinem Computer.$\r$\n$\r$\nMus-IQ trackt deinen Spotify-Verlauf automatisch im Hintergrund – damit du immer weißt, was du hörst.$\r$\n$\r$\nKlicke auf Weiter, um fortzufahren."

; Finish page
!define MUI_FINISHPAGE_TITLE "Mus-IQ Desktop ist installiert!"
!define MUI_FINISHPAGE_TEXT "Mus-IQ Desktop wurde erfolgreich installiert.$\r$\n$\r$\nDie App startet automatisch beim Systemstart und trackt deinen Spotify-Verlauf im Hintergrund.$\r$\n$\r$\nViel Spaß mit Mus-IQ!"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Mus-IQ.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Mus-IQ Desktop jetzt starten"
!define MUI_FINISHPAGE_LINK "mus-iq.com besuchen"
!define MUI_FINISHPAGE_LINK_LOCATION "https://mus-iq.com"

; Uninstall confirm
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Mus-IQ Desktop wird von deinem Computer entfernt."

; Abort warning
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Möchtest du die Installation wirklich abbrechen?"

; ─── Install type detection ───────────────────────────────────────────────────
; Detects if Mus-IQ is already installed and shows repair/reinstall option
Var AlreadyInstalled
Var InstallMode  ; "fresh", "repair", "update"

Function detectInstallMode
  StrCpy $InstallMode "fresh"
  StrCpy $AlreadyInstalled "0"

  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" "DisplayVersion"
  ${If} $0 != ""
    StrCpy $AlreadyInstalled "1"
    StrCpy $InstallMode "repair"
  ${EndIf}
  
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" "DisplayVersion"
  ${If} $0 != ""
    StrCpy $AlreadyInstalled "1"
    StrCpy $InstallMode "repair"
  ${EndIf}
FunctionEnd

; ─── Custom pages ─────────────────────────────────────────────────────────────

; Welcome page with mode detection
Function customWelcomePre
  Call detectInstallMode
  ${If} $InstallMode == "repair"
    ; Change welcome text for repair/update scenario
    SendMessage $mui.WelcomePage.Text ${WM_SETTEXT} 0 \
      "STR:Eine frühere Version von Mus-IQ Desktop wurde gefunden.$\r$\n$\r$\nDieses Setup wird Mus-IQ Desktop reparieren oder auf die neueste Version aktualisieren.$\r$\n$\r$\nKlicke auf Weiter, um fortzufahren."
  ${EndIf}
FunctionEnd

; ─── Pages order ──────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ─── Languages ────────────────────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "English"

; ─── Install section ──────────────────────────────────────────────────────────
Section "Mus-IQ Desktop" SecMain
  SectionIn RO  ; Required section

  SetOutPath "$INSTDIR"
  
  ; Copy all app files
  File /r "${BUILD_RESOURCES_DIR}\*.*"

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Write registry for Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "DisplayName" "Mus-IQ Desktop"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "Publisher" "Mus-IQ"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "DisplayIcon" "$INSTDIR\Mus-IQ.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "URLInfoAbout" "https://mus-iq.com"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "HelpLink" "https://mus-iq.com"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "NoModify" 0
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ" \
    "NoRepair" 0

  ; Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\Mus-IQ"
  CreateShortCut "$SMPROGRAMS\Mus-IQ\Mus-IQ Desktop.lnk" "$INSTDIR\Mus-IQ.exe" \
    "" "$INSTDIR\Mus-IQ.exe" 0
  CreateShortCut "$SMPROGRAMS\Mus-IQ\Mus-IQ deinstallieren.lnk" "$INSTDIR\Uninstall.exe" \
    "" "$INSTDIR\Uninstall.exe" 0

  ; Desktop shortcut
  CreateShortCut "$DESKTOP\Mus-IQ Desktop.lnk" "$INSTDIR\Mus-IQ.exe" \
    "" "$INSTDIR\Mus-IQ.exe" 0

SectionEnd

; ─── Repair section ───────────────────────────────────────────────────────────
Section "Repair" SecRepair
  SectionIn 2  ; Only shown in repair mode

  DetailPrint "Mus-IQ wird repariert..."
  SetOutPath "$INSTDIR"
  File /r "${BUILD_RESOURCES_DIR}\*.*"
  DetailPrint "Reparatur abgeschlossen!"

SectionEnd

; ─── Uninstall section ────────────────────────────────────────────────────────
Section "Uninstall"

  ; Remove app files
  RMDir /r "$INSTDIR"

  ; Remove Start Menu shortcuts
  RMDir /r "$SMPROGRAMS\Mus-IQ"

  ; Remove Desktop shortcut
  Delete "$DESKTOP\Mus-IQ Desktop.lnk"

  ; Remove registry entries
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Mus-IQ"
  DeleteRegKey HKCU "Software\Mus-IQ"

  ; Remove autostart entry if set
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotify Tracker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mus-IQ"

  ; Ask if user wants to keep settings/data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Einstellungen und lokalen Daten behalten?$\r$\n$\r$\nKlicke Nein um alle Daten zu löschen." \
    IDYES keepData

  ; Remove app data if user chose to delete
  RMDir /r "$APPDATA\MusIQ-Desktop-App"
  RMDir /r "$LOCALAPPDATA\MusIQ-Desktop-App"

  keepData:
  
  DetailPrint "Mus-IQ Desktop wurde erfolgreich deinstalliert."

SectionEnd
