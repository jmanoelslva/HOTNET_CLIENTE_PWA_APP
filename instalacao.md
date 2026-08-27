Agora prepare a instalação da seguinte forma para servidor debian:

1. Preparar um install.sh que inicie instalação, com uma pequena introdução;
2. Solicite qual dominio será utilizado na aplicação
3. Pergunte se utilizar Apache ou Nginx e instala o pacote com as devidas dependencias
4. Verifica se há lets encrypt para o dominio digitado, senão instala para aquele dominio e ativa renovação automática do certificado
5. Se já tiver um servidor executando na porta 80, ajusta os arquivo apache ou ngnix para subdominio informado