# Workflow diagram builder

## Dependencies:

``` {.sh}
node -v
v12.13.0 (lts/dubnium)

npm -v
6.12.0

moddle-bpmn
```

## Development guidelines

``` {.js}
NomeDeClasse
nomeDeMetodo
nomeDeFuncao
nome_de_variavel
nome_de_getter
nome_de_setter
```

``` {.js}
Classe{
estáticos
construtor
getters que tem setters
getters sozinhos
setters sozinhos
metodos publicos
metodos privados
}
```

## Run tests:

``` {.sh}
npm test
```

## Description:

This module provides methods to create a BPMN diagram from a JSON blueprint spec. The BPMN diagram is described in the [BPMN XML standard](https://www.omg.org/spec/BPMN/2.0/), the same used in tools as [Cawemo](https://cawemo.com/).

The diagram construction is based in the paper "[A simple algorithm for automatic layout of bpmn processes](https://www.researchgate.net/publication/221542866_A_Simple_Algorithm_for_Automatic_Layout_of_BPMN_Processes)" KITZMANN, Ingo, et al. 2009
