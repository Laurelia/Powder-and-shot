function Promotion8() {}

Promotion8.prototype.Schema =
	"<element name='Entity'>" +
		"<text/>" +
	"</element>" +
	"<element name='RequiredXp'>" +
		"<data type='positiveInteger'/>" +
	"</element>";

Promotion8.prototype.Init = function()
{
	this.currentXp = 0;
};

Promotion8.prototype.GetRequiredXp = function()
{
	return ApplyValueModificationsToEntity("Promotion8/RequiredXp", +this.template.RequiredXp, this.entity);
};

Promotion8.prototype.GetCurrentXp = function()
{
	return this.currentXp;
};

Promotion8.prototype.GetPromotedTemplateName = function()
{
	return this.template.Entity;
};

Promotion8.prototype.Promote = function(promotedTemplateName)
{
	// If the unit is dead, don't promote it
	let cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
	if (cmpHealth && cmpHealth.GetHitpoints() == 0)
	{
		this.promotedUnitEntity = INVALID_ENTITY;
		return;
	}

	// Save the entity id.
	this.promotedUnitEntity = ChangeEntityTemplate(this.entity, promotedTemplateName);

	let cmpPosition = Engine.QueryInterface(this.promotedUnitEntity, IID_Position);
	let cmpUnitAI = Engine.QueryInterface(this.promotedUnitEntity, IID_UnitAI);

	if (cmpPosition && cmpPosition.IsInWorld() && cmpUnitAI)
		cmpUnitAI.Cheer();
};

Promotion8.prototype.IncreaseXp = function(amount)
{
	// if the unit was already promoted, but is waiting for the engine to be destroyed
	// transfer the gained xp to the promoted unit if applicable
	if (this.promotedUnitEntity)
	{
		let cmpPromotion8 = Engine.QueryInterface(this.promotedUnitEntity, IID_Promotion8);
		if (cmpPromotion8)
			cmpPromotion8.IncreaseXp(amount);
		return;
	}

	this.currentXp += +(amount);
	var requiredXp = this.GetRequiredXp();

	if (this.currentXp >= requiredXp)
	{
		var cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		var playerID = QueryOwnerInterface(this.entity, IID_Player).GetPlayerID();
		this.currentXp -= requiredXp;
		var promotedTemplateName = this.GetPromotedTemplateName();
		// check if we can upgrade a second time (or even more)
		while (true)
		{
			var template = cmpTemplateManager.GetTemplate(promotedTemplateName);
			if (!template.Promotion8)
				break;
			requiredXp = ApplyValueModificationsToTemplate("Promotion8/RequiredXp", +template.Promotion8.RequiredXp, playerID, template);
			// compare the current xp to the required xp of the promoted entity
			if (this.currentXp < requiredXp)
				break;
			this.currentXp -= requiredXp;
			promotedTemplateName = template.Promotion8.Entity;
		}
		this.Promote(promotedTemplateName);
		let cmpPromotion8 = Engine.QueryInterface(this.promotedUnitEntity, IID_Promotion8);
		if (cmpPromotion8)
			cmpPromotion8.IncreaseXp(this.currentXp);
	}

	Engine.PostMessage(this.entity, MT_ExperienceChanged, {});
};

Promotion8.prototype.OnValueModification = function(msg)
{
	if (msg.component == "Promotion8")
		this.IncreaseXp(0);
};

Engine.RegisterComponentType(IID_Promotion8, "Promotion8", Promotion8);
