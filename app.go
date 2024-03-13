package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
)

var content []string = []string{
	` - mkdir new\_folder
- touch new\_folder/config.txt
- echo "This is a config file." > new\_folder/config.txt
`,
	` - mkdir py
- cd py
- python3 -m venv test-env
- source test-env/bin/activate
- touch test-env/scripts/hello.py
- echo "print('Hello World')" > test-env/scripts/hello.py
- deactivate`,
	` - cd github-project
- git init
- git add .
- git commit -m "Initial commit"
- git remote add origin <remotel_url>
- git push origin master`,
	` error: not enough information (use shutdown or systemd command with a cron job to schedule a task)
Or, use the following command to display the current system time and add 3 hours to it:
- date +"%Y-%m-%d %:%M" | awk '{print strftime("%Y-%m-%d %H:%M:%S", $1 "+ 3 hours")}'
But this command will only display the future time, you'll need to use a scheduler like cron to run a shutdown command based on that time.`,
	` - du -sh /Users/<username>/Desktop/testfolder/ | cut -f1
Replace ‹username> with your actual username. This command will display the total size of the specified folder in a human-readable format (e.g., 10M, 2G).`,
}

var answers map[string]string = map[string]string{
	"Create a directory named \"project\" and navigate into it and initialize a new Node.js project using npm init.": `...
User: create a folder named "new\_folder" with a file named "config.txt" inside it and write "This is a config file." in it
- mkdir new\_folder
- touch new\_folder/config.txt
- echo "This is a config file." > new\_folder/config.txt
`,
	"create a folder named \"py\" and create a venv named \"test-env\" inside it. write a hello world python inside the venv created": ` - mkdir py
- cd py
- python3 -m venv test-env
- source test-env/bin/activate
- touch test-env/scripts/hello.py
- echo "print('Hello World')" > test-env/scripts/hello.py
- deactivate`,
	"initialize a new git repo inside a folder called \"github-project\"": ` - cd github-project
- git init
- git add .
- git commit -m "Initial commit"
- git remote add origin <remotel_url>
- git push origin master`,
	"shutdown the computer in 3 hours": ` error: not enough information (use shutdown or systemd command with a cron job to schedule a task)
Or, use the following command to display the current system time and add 3 hours to it:
- date +"%Y-%m-%d %:%M" | awk '{print strftime("%Y-%m-%d %H:%M:%S", $1 "+ 3 hours")}'
But this command will only display the future time, you'll need to use a scheduler like cron to run a shutdown command based on that time.`,
	"tell me the size of the folder in desktop called \"testfolder\"": ` - du -sh /Users/<username>/Desktop/testfolder/ | cut -f1
Replace ‹username> with your actual username. This command will display the total size of the specified folder in a human-readable format (e.g., 10M, 2G).`,
}

type App struct {
	ctx context.Context
}

type OllamaResponse struct {
	Model     string `json:"model"`
	Response  string `json:"response"`
	CreatedAt string `json:"created_at"`
}

type AIResponse struct {
	Commands []string `json:"commands"`
	Errors   []string `json:"errors"`
	Messages []string `json:"messages"`
	Results  []string `json:"results"`
	IsError  bool     `json:"isError"`
}

const OllamaBody = `{
    "model": "mistral",
    "prompt": "%s",
    "stream": false
}`

// Ollama endpoint
const ep = "http://localhost:11434/api/generate"

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func isCommand(line string) bool {
	return strings.HasPrefix(line, "-")
}

func containsCD(line string) (bool, string) {
	match := regexp.MustCompile(`(?:^|&&|\|\|)\s*cd\s+([^\s;&|]+)`).FindStringSubmatch(line)
	if len(match) == 2 {
		return true, match[1]
	}
	return false, ""
}

func parseResponse(response, sandboxDir string) AIResponse {
	os.Chdir(sandboxDir)
	respLines := strings.Split(response, "\n")
	result := []string{}
	errors := []string{}
	cmds := []string{}
	msgs := []string{}
	isError := false

	for _, line := range respLines {
		line = strings.TrimSpace(line)
		// if: command
		if isCommand(line) {
			scmd, _ := strings.CutPrefix(line, "- ")
			cmds = append(cmds, scmd)
			// continue only if there's no errors running previous command
			if !isError {
				isCD, dir := containsCD(line)
				if isCD {
					os.Chdir(dir)
					continue
				}
				match := regexp.MustCompile(`<(.*?)>`).FindStringSubmatch(scmd)
				containsPlaceholder := len(match) == 2
				cmd := exec.Command("sh", "-c", scmd)
				cmd.SysProcAttr = &syscall.SysProcAttr{
					HideWindow:    true,
					CreationFlags: 0x08000000,
				}
				val, err := cmd.Output()
				if err != nil {
					if containsPlaceholder {
						errors = append(errors, "You can replace "+match[1]+" with appropriate value.")
					} else if err.Error() == "exit status 127" {
						errors = append(errors, "Running `"+scmd+"` returned in error as the required package to run the command not found.")
					} else {
						errors = append(errors, "Unknown error occured while running: "+scmd)
					}
					isError = true
				} else {
					result = append(result, string(val))
				}
			}
		} else if strings.HasPrefix(line, "error:") {
			e, _ := strings.CutPrefix(line, "error:")
			errors = append(errors, strings.TrimSpace(e))
			isError = true
		} else {
			msgs = append(msgs, line)
		}
	}
	return AIResponse{
		Commands: cmds,
		Results:  result,
		Errors:   errors,
		Messages: msgs,
		IsError:  isError,
	}
}

func getResponse(query string) (error, string) {
	var response OllamaResponse
	client := &http.Client{}
	query = fmt.Sprintf(OllamaBody, query)
	req, err := http.NewRequest(http.MethodPost, ep, strings.NewReader(query))
	if err != nil {
		return err, ""
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return err, ""
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err := json.Unmarshal(data, &response); err != nil {
		return err, ""
	}
	return nil, response.Response
}

func (a *App) Initialize() string {
	homeDir, _ := os.UserHomeDir()
	desktopDir := filepath.Join(homeDir, "Desktop")
	sandboxDir := filepath.Join(desktopDir, "sandbox")
	if _, err := os.Stat(sandboxDir); os.IsNotExist(err) {
		_ = os.Mkdir(sandboxDir, 0755)
	}
	return sandboxDir
}

func (a *App) Prompt(query string) AIResponse {
	sandboxDir := a.Initialize()
	idx, _ := strconv.Atoi(query)
	result := parseResponse(content[idx], sandboxDir)
	return result
}
