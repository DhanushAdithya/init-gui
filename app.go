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
	"strings"
	"syscall"
)

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
    "model": "li",
    "prompt": "%s",
    "stream": false
}`

// Ollama endpoint
const ep = "https://a6e2-2402-e280-2199-40-289d-1229-e85e-182a.ngrok-free.app/api/generate"

// const ep = "http://8c3d-45-119-28-158.ngrok-free.app/api/generate"

// const ep = "http://localhost:11434/api/generate"

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
	os.Chdir(sandboxDir)
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
		return err, "Request failed while creating request"
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return err, "Request failed"
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err := json.Unmarshal(data, &response); err != nil {
		return err, "Issue with JSON"
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
	_, resp := getResponse(query)
	result := parseResponse(resp, sandboxDir)
	return result
}
