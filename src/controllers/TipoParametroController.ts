import PgDataSource from "../data-source";
import { TipoParametro } from "../entities/TipoParametro";
import InsereAtributoTipoParametro from "../services/TipoParametro/InsereAtributoTipoParametro";
import ConfereIgualdadeTipoParametro from "../services/TipoParametro/ConfereIgualdadeTipoParametro";
import { Request, Response } from "express";
import AbstratoController from "./AbstratoController";
import TratarValoresFiltroTipoParametro from "../services/TipoParametro/TratarValoresFiltroTipoParametro";
import SelecaoPaginadaTipoParametro from "../services/TipoParametro/SelecaoPaginadaTipoParametro";
import AtualizaAtrifutoTipoParametro from "../services/TipoParametro/AtualizaAtributoTipoParametro";
import DelecaoCascataParametro from "../services/Parametro/DelecaoCascataParametro";


class TipoParametroController extends AbstratoController {    

    async cadastrar(req: Request, res: Response){
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        let novoTipoParametro = new TipoParametro()
        novoTipoParametro = InsereAtributoTipoParametro.inserir(novoTipoParametro, req)
        const resultado = await ConfereIgualdadeTipoParametro.conferir(novoTipoParametro)
        if(resultado == false && novoTipoParametro.unidadeTipoParametro && novoTipoParametro.nomeTipoParametro){
            res.status(400).send("TipoParametro identico já cadastrada")
            return;
        }
        try{
            await repositorioTipoParametro.save(novoTipoParametro);
            res.status(200).send("Tipo parametro cadastrado com sucesso")
        } catch(error){
            if(error.code == "23502")
                return res.status(400).send("nomeTipoParametro e unidadeTipoParametro não podem ser nulo");
            if(error.code == "22001")
                return res.status(400).send("tamanho da unidade ou do nome excedido");
            throw error
        }
    }

    async listarEspecifico(req: Request, res: Response): Promise<void> {
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        const id = parseInt(req.params.id)
        const tipoParametro = await repositorioTipoParametro.findOne({where:{idTipoParametro:id, statusTipoParametro:true}})

        if(tipoParametro){
            res.status(200).send(tipoParametro)
            return;
        }
        res.status(400).send("Tipo Parametro não encontrado")
    }

    async listarPaginada(req: Request, res: Response): Promise<void> {
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        const pagina = req.query.pagina ? parseInt(req.query.pagina as string) : 1;
        const tamanhoPagina = req.query.tamanhoPagina ? parseInt(req.query.tamanhoPagina as string) : 10;  
        const quantidadeLinhas = await repositorioTipoParametro.count(TratarValoresFiltroTipoParametro.tratarContagem(req))
        const quantidadePaginas = Math.ceil(quantidadeLinhas/tamanhoPagina)
        try{
            const filtroSelecao = TratarValoresFiltroTipoParametro.tratarSelect(req)
            let tiposParametros = await SelecaoPaginadaTipoParametro.selecionar(repositorioTipoParametro, pagina, tamanhoPagina, filtroSelecao)
            const resposta = { tiposParametros:tiposParametros, pagina:pagina, tamanhoPagina:tamanhoPagina, quantidadePaginas:quantidadePaginas }
            res.status(200).send(resposta)
        } catch(error){
            if(pagina == 0)
                res.status(400).send("Não é permitido requisitar a página 0")
            else{
                res.status(400).send(error)
                console.log(error)
            }
        }
    }

    async listarParaSelecaoComIdEstacao(req:Request, res:Response){
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        const idEstacao = req.params.idEstacao
        const tipoParametro = await repositorioTipoParametro
            .createQueryBuilder("tipo_parametro")
            .leftJoin("tipo_parametro.parametros", "parametro")
            .leftJoin("parametro.estacoes", "estacoes")
            .select(["tipo_parametro.idTipoParametro", "tipo_parametro.nomeTipoParametro", "tipo_parametro.unidadeTipoParametro", "tipo_parametro.fatorTipoParametro", "tipo_parametro.offsetTipoParametro"])
            .where("tipo_parametro.statusTipoParametro = :status AND parametro.estacoesIdEstacao = estacoes.idEstacao AND parametro.estacoesIdEstacao = :idEstacao AND parametro.tiposParametroIdTipoParametro = tipo_parametro.idTipoParametro AND parametro.statusParametro = :statusParametro", { status: true, idEstacao:idEstacao, statusParametro: true })
            .getMany();
        res.status(200).send(tipoParametro)
    }

    async listarParaSelecao(req:Request, res:Response){
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        const tipoParametro = await repositorioTipoParametro
            .createQueryBuilder("tipo_parametro")
            .select(["tipo_parametro.idTipoParametro", "tipo_parametro.nomeTipoParametro", "tipo_parametro.unidadeTipoParametro", "tipo_parametro.fatorTipoParametro", "tipo_parametro.offsetTipoParametro"])
            .where("tipo_parametro.statusTipoParametro = :status", { status: true })
            .getMany();
        res.status(200).send(tipoParametro)
    }



    async atualizar(req: Request, res: Response): Promise<void> {
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro)
        const id = parseInt(req.body.idTipoParametro)
        let tipoParametro = await repositorioTipoParametro.findOne({where:{idTipoParametro:id}})
        if(tipoParametro == undefined){
            res.status(400).send("Id do Tipo Parametro não encontrado")
            return;
        }
        tipoParametro = AtualizaAtrifutoTipoParametro.atualizar(tipoParametro, req)
        const resultado = await ConfereIgualdadeTipoParametro.conferir(tipoParametro)
        if(resultado == false){
            res.status(400).send("TipoParametro identico já existe no banco de dados")
            return;
        }
        await repositorioTipoParametro.save(tipoParametro)
        res.status(200).send("Tipo parametro atualizado com sucesso")

    }

    async deletar(req: Request, res: Response) {
        const repositorioTipoParametro = PgDataSource.getRepository(TipoParametro);
        const id = parseInt(req.params.id);
        let tipoParametro = await repositorioTipoParametro.findOne({where:{idTipoParametro:id}});
        if(tipoParametro == undefined){
            res.status(400).send("Tipo Parametro não pode ser deletado pois não existe")
            return;
        }
        await DelecaoCascataParametro.deletar(tipoParametro)
        tipoParametro.statusTipoParametro = false;
        await repositorioTipoParametro.save(tipoParametro);
        res.status(200).send("Tipo Parametro deletado com sucesso")
    }

}
export default new TipoParametroController()