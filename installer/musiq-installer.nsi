; ─────────────────────────────────────────────────────────────────────────────
; Mus-IQ Desktop – Complete Custom NSIS Installer
; installer/musiq-installer.nsi
; ─────────────────────────────────────────────────────────────────────────────

Unicode true

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; ─── App Info ─────────────────────────────────────────────────────────────────
!define APP_NAME        "Mus-IQ Desktop"
!define APP_VERSION     "${VERSION}"
!define APP_PUBLISHER   "Mus-IQ"
!define APP_URL         "https://mus-iq.com"
!define APP_EXE         "Mus-IQ.exe"
!define APP_GUID        "com.musiq.desktop"
!define APP_REG_KEY     "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.musiq.desktop"

; ─── Installer Config ─────────────────────────────────────────────────────────
Name "${APP_NAME}"
OutFile "${INSTALLER_OUT}"
InstallDir "$LOCALAPPDATA\${APP_NAME}"
InstallDirRegKey HKCU "${APP_REG_KEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${APP_NAME} ${APP_VERSION}  •  Track your music. Know your taste."
SetCompressor /SOLID lzma

; ─── MUI Config ───────────────────────────────────────────────────────────────
!define MUI_ICON                            "${MUI_ICON}"
!define MUI_UNICON                          "${MUI_UNICON}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP              "${MUI_HEADERIMAGE_BITMAP}"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP        "${MUI_WELCOMEFINISHPAGE_BITMAP}"
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT              "Möchtest du die Installation wirklich abbrechen?"

; ─── Welcome Page ─────────────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE              "Willkommen bei Mus-IQ Desktop"
!define MUI_WELCOMEPAGE_TEXT               "Mus-IQ trackt deinen Spotify-Verlauf automatisch im Hintergrund.$\r$\n$\r$\n• Sieh welche Songs du wann gehört hast$\r$\n• Statistiken über deine Hörgewohnheiten$\r$\n• Discord Rich Presence Integration$\r$\n• Läuft unsichtbar im Hintergrund$\r$\n$\r$\nKlicke auf Weiter um die Installation zu starten."

; ─── Finish Page ──────────────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE               "Mus-IQ Desktop ist bereit!"
!define MUI_FINISHPAGE_TEXT                "Die Installation war erfolgreich.$\r$\n$\r$\nMus-IQ läuft ab sofort im Hintergrund und trackt deinen Spotify-Verlauf automatisch.$\r$\n$\r$\nMelde dich mit deinem mus-iq.com Account an um loszulegen."
!define MUI_FINISHPAGE_RUN                 "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT            "Mus-IQ Desktop jetzt starten"
!define MUI_FINISHPAGE_LINK                "mus-iq.com öffnen"
!define MUI_FINISHPAGE_LINK_LOCATION       "${APP_URL}"
!define MUI_FINISHPAGE_SHOWREADME          ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

; ─── Uninstall Welcome ────────────────────────────────────────────────────────
!define MUI_UNWELCOMEPAGE_TITLE            "Mus-IQ Desktop deinstallieren"
!define MUI_UNWELCOMEPAGE_TEXT             "Dieser Assistent wird Mus-IQ Desktop von deinem Computer entfernen.$\r$\n$\r$\nKlicke auf Weiter um fortzufahren."
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; ─── Pages ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom RepairPage RepairPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ─── Languages ────────────────────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "English"

; ─── Variables ────────────────────────────────────────────────────────────────
Var RepairMode
Var DesktopShortcut
Var AutostartEnabled

; ─── Repair Page ──────────────────────────────────────────────────────────────
Function RepairPage
  ; Check if already installed
  ReadRegStr $0 HKCU "${APP_REG_KEY}" "DisplayVersion"
  ${If} $0 != ""
    nsDialogs::Create 1018
    Pop $0

    ${NSD_CreateLabel} 0 0 100% 40u "Eine frühere Version von Mus-IQ Desktop ($0) wurde gefunden.$\r$\nWähle eine Option:"
    Pop $0

    ${NSD_CreateRadioButton} 10u 50u 100% 12u "Aktualisieren / Reparieren (empfohlen)"
    Pop $1
    ${NSD_SetState} $1 ${BST_CHECKED}

    ${NSD_CreateRadioButton} 10u 68u 100% 12u "Neuinstallation (löscht bestehende Installation)"
    Pop $2

    nsDialogs::Show
  ${Else}
    Abort ; Skip this page if not installed
  ${EndIf}
FunctionEnd

Function RepairPageLeave
  StrCpy $RepairMode "repair"
FunctionEnd

; ─── Init ─────────────────────────────────────────────────────────────────────
Function .onInit
  ; Default values
  StrCpy $DesktopShortcut "1"
  StrCpy $AutostartEnabled "0"
  StrCpy $RepairMode "fresh"

  ; 64-bit check
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
FunctionEnd

; ─── Install Section ──────────────────────────────────────────────────────────
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Extract app files
  File /r "${BUILD_RESOURCES_DIR}\*.*"

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Registry – Add/Remove Programs
  WriteRegStr   HKCU "${APP_REG_KEY}" "DisplayName"      "${APP_NAME}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "DisplayVersion"   "${APP_VERSION}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "Publisher"        "${APP_PUBLISHER}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "DisplayIcon"      "$INSTDIR\${APP_EXE}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "InstallLocation"  "$INSTDIR"
  WriteRegStr   HKCU "${APP_REG_KEY}" "UninstallString"  '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKCU "${APP_REG_KEY}" "URLInfoAbout"     "${APP_URL}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "HelpLink"         "${APP_URL}"
  WriteRegStr   HKCU "${APP_REG_KEY}" "Comments"         "Track your music. Know your taste."
  WriteRegDWORD HKCU "${APP_REG_KEY}" "NoModify"         0
  WriteRegDWORD HKCU "${APP_REG_KEY}" "NoRepair"         0

  ; Estimated size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${APP_REG_KEY}" "EstimatedSize" "$0"

  ; Start Menu
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"    "$INSTDIR\${APP_EXE}"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\Deinstallieren.lnk" "$INSTDIR\Uninstall.exe"

  ; Desktop shortcut
  ${If} $DesktopShortcut == "1"
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  ${EndIf}

SectionEnd

; ─── Uninstall Section ────────────────────────────────────────────────────────
Section "Uninstall"

  ; Stop running instance
  ExecWait 'taskkill /F /IM "${APP_EXE}"' $0

  ; Remove files
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  ; Remove autostart
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Spotify Tracker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Mus-IQ"

  ; Remove registry
  DeleteRegKey HKCU "${APP_REG_KEY}"

  ; Ask about user data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Einstellungen und lokalen Daten behalten?$\r$\n$\r$\nKlicke 'Nein' um alle gespeicherten Daten zu löschen." \
    IDYES musiq_keep_data

  RMDir /r "$APPDATA\MusIQ-Desktop-App"
  RMDir /r "$LOCALAPPDATA\MusIQ-Desktop-App"

  musiq_keep_data:

SectionEnd

; ─── Uninstall Init ───────────────────────────────────────────────────────────
Function un.onInit
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
FunctionEnd
