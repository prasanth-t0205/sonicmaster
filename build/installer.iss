#define AppName      "SonicMaster"
#ifndef AppVersion
  #define AppVersion   "1.0.0"
#endif
#define AppPublisher "Prefenzo Technologies"
#define AppURL       "https://sonicmaster.prefenzotechnologies.com"
#define AppExeName   "SonicMaster.exe"
#define AppId        "com.sonicmaster.player"
#define SourceDir    "..\release\win-unpacked"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=..\release
OutputBaseFilename=SonicMaster-Setup-{#AppVersion}
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=yes
LicenseFile=license.txt
DisableDirPage=no
UsePreviousAppDir=no
DirExistsWarning=no
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersion}
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";    GroupDescription: "{cm:AdditionalIcons}"
Name: "startmenuicon"; Description: "Create a Start Menu shortcut"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: startmenuicon
Name: "{autodesktop}\{#AppName}";  Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[Registry]
Root: HKCU; Subkey: "Software\Classes\.mp3";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.wav";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.flac"; ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.ogg";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.m4a";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.aac";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.wma";  ValueType: string; ValueName: ""; ValueData: "{#AppId}.AudioFile"; Flags: uninsdeletevalue

Root: HKCU; Subkey: "Software\Classes\{#AppId}.AudioFile";                    ValueType: string; ValueName: ""; ValueData: "SonicMaster Audio File"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\{#AppId}.AudioFile\DefaultIcon";        ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExeName},0"
Root: HKCU; Subkey: "Software\Classes\{#AppId}.AudioFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExeName}"" ""%1"""

Root: HKCU; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "{#AppName}"; ValueData: "Software\Clients\Media\{#AppName}\Capabilities"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities"; ValueType: string; ValueName: "ApplicationName";        ValueData: "{#AppName}";                                          Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "High-fidelity music player with advanced audio engine."
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".mp3";  ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".wav";  ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".flac"; ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".ogg";  ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".m4a";  ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".aac";  ValueData: "{#AppId}.AudioFile"
Root: HKCU; Subkey: "Software\Clients\Media\{#AppName}\Capabilities\FileAssociations"; ValueType: string; ValueName: ".wma";  ValueData: "{#AppId}.AudioFile"

[InstallDelete]
Type: filesandordirs; Name: "{app}\*"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
function IsDirEmpty(const Dir: String): Boolean;
var
  FindRec: TFindRec;
begin
  Result := True;
  if DirExists(Dir) then
  begin
    if FindFirst(AddBackslash(Dir) + '*', FindRec) then
    begin
      try
        repeat
          if (FindRec.Name <> '.') and (FindRec.Name <> '..') then
          begin
            Result := False;
            Break;
          end;
        until not FindNext(FindRec);
      finally
        FindClose(FindRec);
      end;
    end;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  SelectedDir: String;
begin
  Result := True;
  
  if CurPageID = wpSelectDir then
  begin
    SelectedDir := WizardDirValue();
    
    // Check if the directory exists and is not empty
    if DirExists(SelectedDir) and not IsDirEmpty(SelectedDir) then
    begin
      // If it belongs to our application (i.e. has SonicMaster.exe), allow it instantly without any warning
      if not FileExists(AddBackslash(SelectedDir) + 'SonicMaster.exe') then
      begin
        // If it does not belong to our application, show a critical warning dialog
        if MsgBox(
          'Warning: The selected folder is not empty and does not appear to contain a previous installation of SonicMaster.' + #13#10 + #13#10 +
          'Installing to this folder could overwrite or permanently delete existing files belonging to other applications.' + #13#10 + #13#10 +
          'Are you sure you want to proceed and install to this directory anyway?',
          mbCriticalError,
          MB_YESNO or MB_DEFBUTTON2
        ) = idYes then
        begin
          Result := True;
        end else
        begin
          Result := False;
        end;
      end;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssDone then
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\com.sonicmaster.player.AudioFile');
end;
