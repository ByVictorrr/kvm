package kvm

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// eklCommand returns the 5-byte RS-232 command string for the eKL 81HK input (1-8).
// Protocol confirmed from eKL 81HK documentation:
//
//	Input 1: 30 30 30 0A 0D  →  "000\n\r"
//	Input 8: 30 30 37 0A 0D  →  "007\n\r"
func eklCommand(input int) (string, error) {
	if input < 1 || input > 8 {
		return "", fmt.Errorf("input must be 1-8, got %d", input)
	}
	return string([]byte{0x30, 0x30, byte(0x30 + input - 1), 0x0A, 0x0D}), nil
}

// handleEKLInput handles POST /api/ekl/input/:input.
// It sends the appropriate 5-byte RS-232 command through JetKVM's existing
// serialMux (device /dev/ttyS3, 115200 8N1) without opening the UART directly.
//
// Response:
//
//	200  {"success":true,"input":3}
//	400  {"error":"input must be 1-8"}
//	500  {"error":"<serialMux error>"}
func handleEKLInput(c *gin.Context) {
	input, err := strconv.Atoi(c.Param("input"))
	if err != nil || input < 1 || input > 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "input must be 1-8"})
		return
	}

	cmd, _ := eklCommand(input) // error impossible: range validated above

	serialLogger.Info().
		Int("input", input).
		Str("tx_hex", fmt.Sprintf("30 30 3%d 0A 0D", input-1)).
		Msg("Switching eKL 81HK KVM input")

	if err := sendCustomCommand(cmd); err != nil {
		serialLogger.Warn().Err(err).Int("input", input).Msg("eKL switch failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "input": input})
}
