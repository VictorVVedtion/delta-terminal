"""报告API端点"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
import logging

from src.models.schemas import ReportRequest, ReportResponse
from src.reports.generator import ReportGenerator
from src.api.endpoints.backtest import running_backtests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["报告"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest) -> ReportResponse:
    """
    生成回测报告

    支持格式:
    - html: 可视化HTML报告
    - excel: Excel数据报告
    - pdf: PDF报告 (TODO)
    """
    # 获取回测结果
    if request.backtest_id not in running_backtests:
        raise HTTPException(
            status_code=404,
            detail=f"回测结果不存在: {request.backtest_id}"
        )

    backtest_result = running_backtests[request.backtest_id]

    try:
        # 生成报告
        generator = ReportGenerator()
        file_path = generator.generate(backtest_result, format=request.format)

        # 构建下载URL
        filename = os.path.basename(file_path)
        download_url = f"/api/v1/reports/download/{filename}"

        return ReportResponse(
            report_id=f"report_{backtest_result.backtest_id}",
            backtest_id=request.backtest_id,
            format=request.format,
            file_path=file_path,
            download_url=download_url,
            created_at=backtest_result.end_time
        )

    except Exception as e:
        logger.error(f"报告生成失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}")


@router.get("/download/{filename}")
async def download_report(filename: str):
    """下载报告文件"""
    from src.config import settings

    file_path = os.path.join(settings.report_output_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="报告文件不存在")

    # 确定媒体类型
    if filename.endswith('.html'):
        media_type = 'text/html'
    elif filename.endswith('.xlsx'):
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif filename.endswith('.pdf'):
        media_type = 'application/pdf'
    else:
        media_type = 'application/octet-stream'

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )


@router.get("/preview/{backtest_id}")
async def preview_report(backtest_id: str):
    """预览报告 (返回HTML)"""
    if backtest_id not in running_backtests:
        raise HTTPException(
            status_code=404,
            detail=f"回测结果不存在: {backtest_id}"
        )

    backtest_result = running_backtests[backtest_id]

    try:
        # 生成临时HTML报告
        generator = ReportGenerator()
        file_path = generator.generate_html(backtest_result)

        return FileResponse(
            path=file_path,
            media_type='text/html'
        )

    except Exception as e:
        logger.error(f"报告预览失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"报告预览失败: {str(e)}")
