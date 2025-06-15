def extract_env_variables(env_file_path, output_file_path):
    variable_names = []

    with open(env_file_path, 'r') as env_file:
        for line in env_file:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                var_name = line.split('=', 1)[0].strip()
                variable_names.append(f'"{var_name}",')

    with open(output_file_path, 'w') as output_file:
        for var in variable_names:
            output_file.write(var + '\n')

    print(f"Extracted {len(variable_names)} variables to {output_file_path}")

extract_env_variables('.env', 'env_variables.txt')