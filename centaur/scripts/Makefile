
package: tempdir zip cleanup

tempdir:
	@echo "[*] Creating temp workspace "
	@mkdir -p __tmpdir__/include __tmpdir__/scripts
	@cp -p ../main.js __tmpdir__
	@cp -p ../include/*.js __tmpdir__/include
	@cp -p ../scripts/copyscripts.sh __tmpdir__/scripts
    
zip:
	@echo "[*] Creating archive"
	@tar -cjf ../centaur.tbz -C __tmpdir__/

cleanup:
	@echo "[*] Cleaning up. Done!"
	@rm -rf __tmpdir__

