;NSIS Modern User Interface
;Welcome/Finish Page Example Script
;Written by Joost Verburg

;--------------------------------
;Include Modern UI

!include "MUI2.nsh"

;--------------------------------
;General

;Name and file
Name "BitBeam"
OutFile "bitbeam.exe"
RequestExecutionLevel admin
!define APPNAME "BitBeam"
!define COMPANYNAME "BitBeam"
!define DESCRIPTION "Your everything, anywhere."
# These three must be integers
!define VERSIONMAJOR 1 # The highest level version - the first number in 1.0.0
!define VERSIONMINOR 1 # The second highest level version - the second number in 0.1.0
!define VERSIONBUILD 1 # The lowest level version - the last number in 0.0.1
# Links about the app
!define HELPURL "http://google.com/" # "Support Information" link
!define UPDATEURL "http://google.com/" # "Product Updates" link
!define ABOUTURL "http://google.com/" # "Publisher" link
# This is the size (in kB) of all the files copied into "Program Files"
!define INSTALLSIZE 312
;Default installation folder
InstallDir "$PROGRAMFILES\${APPNAME}"

;Get installation folder from registry if available
InstallDirRegKey HKCU "Software\${APPNAME}" ""

;Request application privileges for Windows Vista
RequestExecutionLevel admin

;--------------------------------
;Interface Settings

!define MUI_ABORTWARNING

;--------------------------------
; Custom Page

Var hash
Var hCtl_customPage
Var hCtl_customPage_TextBox1
Var hCtl_customPage_Label1
Var hCtl_customPage_Font1

; dialog create function
Function fnc_customPage_Create
  
  ; custom font definitions
  CreateFont $hCtl_customPage_Font1 "Microsoft Sans Serif" "16" "400"
  
  ; === customPage (type: Dialog) ===
  nsDialogs::Create 1018
  Pop $hCtl_customPage
  ${If} $hCtl_customPage == error
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Copy the installer key" ""
  
  ; === TextBox1 (type: Text) ===
  ${NSD_CreateText} 17u 36u 201u 17u $hash
  Pop $hCtl_customPage_TextBox1
  SendMessage $hCtl_customPage_TextBox1 ${WM_SETFONT} $hCtl_customPage_Font1 0
  SetCtlColors $hCtl_customPage_TextBox1 0x000000 0xF0F0F0
  SendMessage $hCtl_customPage_TextBox1 ${EM_SETREADONLY} 1 0
  
  ; === Label1 (type: Label) ===
  ${NSD_CreateLabel} 17u 26u 138u 9u "Enter this key into the web dialog"
  Pop $hCtl_customPage_Label1
  
FunctionEnd

; dialog show function
Function fnc_customPage_Show
  Call fnc_customPage_Create
  nsDialogs::Show $hCtl_customPage
FunctionEnd

;--------------------------------
;Pages

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "License.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
Page custom fnc_customPage_Show
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

;--------------------------------
;Languages

!insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections

Section "Main" SecMain
	
	pwgen::GeneratePassword 20
	Pop $hash
	
	SetOutPath $INSTDIR
	# Files added here should be removed by the uninstaller (see section "uninstall")
	file "node.exe"
	file "..\server\cert\tls-server.crt"
	file /r "node_modules"
	
	NSISdl::download "http://bitbeam.info/static/install/client/client.js" "client.js"
	NSISdl::download "http://bitbeam.info/static/install/client/daemon.js" "daemon.js"
	NSISdl::download "http://bitbeam.info/static/install/client/daemon-uninstall.js" "daemon-uninstall.js"
	NSISdl::download "http://bitbeam.info/static/install/logo.ico" "logo.ico"

	# Now we write the config file
	FileOpen $4 "$INSTDIR\config.json" w
	FileWrite $4 "{$\"key$\": $\"$hash$\"}"
	FileClose $4
	# Execute the bootstrap batch file
	nsExec::ExecToLog '"$INSTDIR\node" "$INSTDIR\daemon.js"'
	;Store installation folder
	SetRegView 64
	WriteRegStr HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\node.exe" "RUNASADMIN"
	SetRegView 32
	WriteRegStr HKCU "Software\${APPNAME}" "" $INSTDIR
	# Registry information for add/remove programs
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "- ${APPNAME} - ${DESCRIPTION}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$\"$INSTDIR\logo.ico$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "$\"${COMPANYNAME}$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "HelpLink" "$\"${HELPURL}$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLUpdateInfo" "$\"${UPDATEURL}$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "$\"${ABOUTURL}$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "$\"${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}$\""
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMinor" ${VERSIONMINOR}
	# There is no option for modifying or repairing the install
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
	# Set the INSTALLSIZE constant (!defined at the top of this script) so Add/Remove Programs can accurately report the size
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" ${INSTALLSIZE}
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "key" $hash
	;Create uninstaller
	WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

;--------------------------------
;Uninstaller Section

Section "Uninstall"
	# Run the uninstall
	nsExec::ExecToLog '"$INSTDIR\node" "$INSTDIR\daemon-uninstall.js"'
	ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "key"
	inetc::get "https://bitbeam.info/installer/uninstall?key=$0" "$TEMP\bitbeamUninstallResponse.txt"
	delete "$TEMP\bitbeamUninstallResponse.txt"
	RMDir /r "$INSTDIR"
	SetRegView 64
	DeleteRegValue HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\node.exe"
	SetRegView 32
	DeleteRegKey /ifempty HKCU "Software\${APPNAME}"
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
SectionEnd