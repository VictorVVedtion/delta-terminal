"""
策略验证服务
"""

from typing import Any
import json
import ast
from loguru import logger

from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate

from ..config import settings
from ..models.schemas import (
    StrategyValidateRequest,
    StrategyValidateResponse,
    ValidationIssue,
)


class StrategyValidatorService:
    """策略验证服务类"""

    def __init__(self):
        """初始化服务"""
        self.llm = ChatAnthropic(
            model=settings.ai_model,
            api_key=settings.anthropic_api_key,
            temperature=0.1,  # 验证任务使用更低的温度
            max_tokens=settings.ai_max_tokens,
        )

    async def validate_strategy(
        self, request: StrategyValidateRequest
    ) -> StrategyValidateResponse:
        """
        验证交易策略

        Args:
            request: 验证请求

        Returns:
            验证响应
        """
        try:
            logger.info("开始验证策略")

            issues: list[ValidationIssue] = []
            is_valid = True

            # 1. 语法检查
            if request.check_syntax:
                syntax_issues = self._check_syntax(request.strategy_code)
                issues.extend(syntax_issues)
                if any(issue.severity == "error" for issue in syntax_issues):
                    is_valid = False

            # 2. 逻辑检查
            if request.check_logic and is_valid:
                logic_issues = await self._check_logic(request.strategy_code)
                issues.extend(logic_issues)
                if any(issue.severity == "error" for issue in logic_issues):
                    is_valid = False

            # 3. 风险检查
            if request.check_risk:
                risk_issues = self._check_risk_controls(request.strategy_code)
                issues.extend(risk_issues)

            # 4. 性能估算
            if request.check_performance:
                performance_issues = await self._estimate_performance(request.strategy_code)
                issues.extend(performance_issues)

            # 5. 计算评分
            score = self._calculate_score(issues)

            # 6. 生成建议
            recommendations = self._generate_recommendations(issues)

            logger.info(f"策略验证完成，发现 {len(issues)} 个问题，评分: {score}")

            return StrategyValidateResponse(
                success=True,
                is_valid=is_valid,
                issues=issues,
                score=score,
                recommendations=recommendations,
            )

        except Exception as e:
            logger.error(f"策略验证失败: {str(e)}")
            return StrategyValidateResponse(
                success=False,
                is_valid=False,
                issues=[
                    ValidationIssue(
                        severity="error",
                        category="system",
                        message=f"验证过程出错: {str(e)}",
                        suggestion="请检查策略代码格式是否正确",
                    )
                ],
                score=0.0,
                recommendations=["验证失败，请修复错误后重试"],
            )

    def _check_syntax(self, strategy_code: str) -> list[ValidationIssue]:
        """检查语法错误"""
        issues: list[ValidationIssue] = []

        try:
            # 尝试解析为JSON
            try:
                data = json.loads(strategy_code)
                # JSON格式验证
                if not isinstance(data, dict):
                    issues.append(
                        ValidationIssue(
                            severity="error",
                            category="syntax",
                            message="策略代码必须是一个JSON对象",
                            suggestion="确保代码是有效的JSON对象格式",
                        )
                    )
            except json.JSONDecodeError:
                # 尝试解析为Python代码
                try:
                    ast.parse(strategy_code)
                except SyntaxError as e:
                    issues.append(
                        ValidationIssue(
                            severity="error",
                            category="syntax",
                            message=f"Python语法错误: {str(e)}",
                            location=f"第 {e.lineno} 行" if hasattr(e, "lineno") else None,
                            suggestion="请修复Python语法错误",
                        )
                    )

        except Exception as e:
            issues.append(
                ValidationIssue(
                    severity="error",
                    category="syntax",
                    message=f"无法解析策略代码: {str(e)}",
                    suggestion="确保代码是有效的JSON或Python格式",
                )
            )

        return issues

    async def _check_logic(self, strategy_code: str) -> list[ValidationIssue]:
        """使用AI检查逻辑问题"""
        prompt_template = ChatPromptTemplate.from_template(
            """你是一个专业的量化交易策略审查专家。请仔细检查以下策略代码的逻辑问题。

策略代码:
{strategy_code}

请检查以下方面:
1. 交易信号逻辑是否合理
2. 是否存在矛盾的条件
3. 是否有可能导致无限循环或死锁
4. 参数设置是否合理
5. 是否有明显的逻辑漏洞

以JSON格式返回发现的问题:
[
  {{
    "severity": "error/warning/info",
    "category": "logic",
    "message": "问题描述",
    "location": "问题位置（如果适用）",
    "suggestion": "修复建议"
  }}
]

如果没有发现问题，返回空数组 []
"""
        )

        try:
            prompt = prompt_template.format(strategy_code=strategy_code)
            response = await self.llm.ainvoke(prompt)
            content = response.content

            # 提取JSON部分
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            issues_data = json.loads(content)
            return [ValidationIssue(**issue) for issue in issues_data]

        except Exception as e:
            logger.warning(f"AI逻辑检查失败: {str(e)}")
            return []

    def _check_risk_controls(self, strategy_code: str) -> list[ValidationIssue]:
        """检查风险控制措施"""
        issues: list[ValidationIssue] = []

        try:
            # 解析策略代码
            try:
                data = json.loads(strategy_code)
            except json.JSONDecodeError:
                # 如果是Python代码，进行简单的文本检查
                return self._check_risk_controls_python(strategy_code)

            # 检查风险管理配置
            risk_management = data.get("risk_management", {})

            # 必需的风险控制项
            required_controls = ["max_position_size", "stop_loss_percent"]

            for control in required_controls:
                if control not in risk_management:
                    issues.append(
                        ValidationIssue(
                            severity="warning",
                            category="risk",
                            message=f"缺少风险控制参数: {control}",
                            suggestion=f"建议添加 {control} 参数以控制风险",
                        )
                    )

            # 检查参数合理性
            max_position_size = risk_management.get("max_position_size", 0)
            if max_position_size > 0.2:
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        category="risk",
                        message=f"单笔仓位过大: {max_position_size*100}%",
                        suggestion="建议将单笔仓位控制在20%以内",
                    )
                )

            stop_loss_percent = risk_management.get("stop_loss_percent", 0)
            if stop_loss_percent == 0:
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        category="risk",
                        message="未设置止损",
                        suggestion="强烈建议设置止损以保护资金",
                    )
                )
            elif stop_loss_percent > 0.1:
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        category="risk",
                        message=f"止损幅度过大: {stop_loss_percent*100}%",
                        suggestion="建议将止损控制在10%以内",
                    )
                )

        except Exception as e:
            logger.warning(f"风险检查失败: {str(e)}")

        return issues

    def _check_risk_controls_python(self, strategy_code: str) -> list[ValidationIssue]:
        """检查Python代码的风险控制"""
        issues: list[ValidationIssue] = []

        # 简单的文本模式匹配
        if "stop_loss" not in strategy_code.lower():
            issues.append(
                ValidationIssue(
                    severity="warning",
                    category="risk",
                    message="代码中未发现止损相关逻辑",
                    suggestion="建议实现止损功能以保护资金",
                )
            )

        if "position_size" not in strategy_code.lower():
            issues.append(
                ValidationIssue(
                    severity="warning",
                    category="risk",
                    message="代码中未发现仓位管理相关逻辑",
                    suggestion="建议实现仓位管理以控制风险",
                )
            )

        return issues

    async def _estimate_performance(self, strategy_code: str) -> list[ValidationIssue]:
        """使用AI估算策略性能"""
        prompt_template = ChatPromptTemplate.from_template(
            """你是一个量化交易策略分析专家。请评估以下策略的潜在性能。

策略代码:
{strategy_code}

请从以下角度评估:
1. 预期收益潜力
2. 风险水平
3. 适用市场环境
4. 潜在的性能问题

以JSON格式返回评估结果:
[
  {{
    "severity": "info",
    "category": "performance",
    "message": "性能评估信息",
    "suggestion": "优化建议"
  }}
]
"""
        )

        try:
            prompt = prompt_template.format(strategy_code=strategy_code)
            response = await self.llm.ainvoke(prompt)
            content = response.content

            # 提取JSON部分
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            issues_data = json.loads(content)
            return [ValidationIssue(**issue) for issue in issues_data]

        except Exception as e:
            logger.warning(f"性能估算失败: {str(e)}")
            return []

    def _calculate_score(self, issues: list[ValidationIssue]) -> float:
        """计算策略评分"""
        # 基础分100分
        score = 100.0

        # 根据问题严重程度扣分
        for issue in issues:
            if issue.severity == "error":
                score -= 20.0
            elif issue.severity == "warning":
                score -= 5.0
            elif issue.severity == "info":
                score -= 1.0

        # 确保分数在0-100之间
        return max(0.0, min(100.0, score))

    def _generate_recommendations(self, issues: list[ValidationIssue]) -> list[str]:
        """生成改进建议"""
        recommendations: list[str] = []

        # 统计问题类型
        error_count = sum(1 for issue in issues if issue.severity == "error")
        warning_count = sum(1 for issue in issues if issue.severity == "warning")

        if error_count > 0:
            recommendations.append(f"发现 {error_count} 个错误，必须修复后才能使用")

        if warning_count > 0:
            recommendations.append(f"发现 {warning_count} 个警告，建议优化以提高策略质量")

        # 添加具体建议
        has_risk_warning = any(issue.category == "risk" for issue in issues)
        if has_risk_warning:
            recommendations.append("建议完善风险管理措施，确保资金安全")

        has_logic_issue = any(issue.category == "logic" for issue in issues)
        if has_logic_issue:
            recommendations.append("建议仔细审查策略逻辑，避免潜在的交易错误")

        # 如果没有严重问题，给出积极建议
        if error_count == 0 and warning_count < 3:
            recommendations.append("策略整体质量良好，建议进行历史数据回测验证")

        return recommendations if recommendations else ["策略验证通过，可以进行下一步测试"]
