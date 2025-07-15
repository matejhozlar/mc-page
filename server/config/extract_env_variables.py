# extract and replace required vars for the config startup
def extract_env_variables_to_js(env_file_path, js_output_path):
    variable_names = []

    with open(env_file_path, 'r') as env_file:
        for line in env_file:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                var_name = line.split('=', 1)[0].strip()
                variable_names.append(f'  "{var_name}",')

    js_content = "const REQUIRED_VARS = [\n"
    js_content += "\n".join(variable_names)
    js_content += "\n];\n\nexport default REQUIRED_VARS;\n"

    with open(js_output_path, 'w') as js_file:
        js_file.write(js_content)

    print(f"✅ Wrote {len(variable_names)} variables to {js_output_path}")

extract_env_variables_to_js('.env', './vars/requiredVars.js')
